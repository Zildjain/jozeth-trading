const REQUEST_HEADER = 'X-Jozeth-Request';

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set(REQUEST_HEADER, '1');
  let body = options.body;
  if (body !== undefined && body !== null && !(body instanceof FormData) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  const response = await fetch(path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`, {
    ...options, body, headers, credentials: 'include',
  });
  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(result?.error || `Request failed (${response.status}).`);
    error.status = response.status;
    error.details = result?.details;
    throw error;
  }
  return result;
}

export async function fetchBootstrap() {
  return apiRequest('/bootstrap');
}

const hasChanged = (before, after, excluded = []) => JSON.stringify(Object.fromEntries(Object.entries(before || {}).filter(([key]) => !excluded.includes(key)))) !== JSON.stringify(Object.fromEntries(Object.entries(after || {}).filter(([key]) => !excluded.includes(key))));
const toMap = (items = []) => new Map(items.map((item) => [item.id, item]));
const changedKeys = (before, after, ignored = []) => [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].filter((key) => !ignored.includes(key) && JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));

function clean(input, keysToOmit = []) {
  const result = { ...input };
  for (const key of keysToOmit) delete result[key];
  return result;
}

async function syncCollection(beforeList, afterList, route, { adminOnly = false, omit = [], createTransform = (x) => clean(x, omit), updateTransform = (x) => clean(x, omit), user, api }) {
  let count = 0;
  const before = toMap(beforeList);
  for (const item of afterList || []) {
    const old = before.get(item.id);
    if (!old) {
      await api(route, { method: 'POST', body: createTransform(item) });
      count++;
      continue;
    }
    if (!hasChanged(old, item, ['id', ...omit])) continue;
    if (adminOnly && item.id === user?.id) {
      const profileKeys = ['name', 'username', 'email', 'contact'];
      if (profileKeys.some((key) => old[key] !== item[key])) {
        await api('/auth/profile', { method: 'PATCH', body: { name: item.name, username: item.username, email: item.email, contact: item.contact || '' } });
        count++;
      }
      const hasOtherAdminChanges = changedKeys(old, item, ['id', ...profileKeys, ...omit]).length > 0;
      if (hasOtherAdminChanges) {
        const body = updateTransform(item);
        for (const key of ['name', 'username', 'email', 'contact', 'password']) delete body[key];
        if (Object.keys(body).length) { await api(`${route}/${encodeURIComponent(item.id)}`, { method: 'PATCH', body }); count++; }
      }
      continue;
    }
    if (route === '/users') {
      const patch = clean(item, ['id', 'password', 'createdAt', 'lastLogin']);
      if (changedKeys(old, item, ['id', 'password', 'createdAt', 'lastLogin']).length) {
        await api(`/users/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: patch });
        count++;
      }
      if (item.password && item.password !== old.password) {
        await api(`/users/${encodeURIComponent(item.id)}/reset-password`, { method: 'POST', body: { password: item.password } });
        count++;
      }
      continue;
    }
    await api(`${route}/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: updateTransform(item) });
    count++;
  }
  return count;
}

/* Translate existing UI state changes into small, allow-listed API commands.
   There is intentionally no endpoint that accepts the entire client state. */
export async function syncStateDiff(previous, next, user) {
  let count = 0;
  const api = apiRequest;
  const oldTx = toMap(previous.transactions);
  const newTx = toMap(next.transactions);
  let transactionCommand = false;
  for (const tx of next.transactions || []) {
    const old = oldTx.get(tx.id);
    if (!old) {
      await api('/transactions', { method: 'POST', body: { id: tx.id, customer: tx.customer, date: tx.date, type: 'Sale', items: (tx.items || []).map((line) => ({ productId: line.productId, quantity: line.quantity })), status: tx.status === 'Completed' ? 'Completed' : 'Pending', remarks: tx.remarks || '' } });
      count++; transactionCommand = true;
    } else if (old.status !== tx.status) {
      if (tx.status === 'Completed' && old.status === 'Pending') await api(`/transactions/${encodeURIComponent(tx.id)}/complete`, { method: 'POST', body: {} });
      else if (tx.status === 'Cancelled' && old.status === 'Pending') await api(`/transactions/${encodeURIComponent(tx.id)}/cancel`, { method: 'POST', body: {} });
      else continue;
      count++; transactionCommand = true;
    }
  }

  const oldPos = toMap(previous.procurements);
  let procurementCommand = false;
  for (const po of next.procurements || []) {
    const old = oldPos.get(po.id);
    if (!old) {
      await api('/procurements', { method: 'POST', body: { id: po.id, supplier: po.supplier, productId: po.productId, quantity: po.quantity, unitCost: po.unitCost, date: po.date, expectedDate: po.expectedDate || '', priority: po.priority || 'Normal', remarks: po.remarks || '' } });
      count++; procurementCommand = true;
    } else if (old.status !== po.status) {
      await api(`/procurements/${encodeURIComponent(po.id)}`, { method: 'PATCH', body: { status: po.status } });
      count++; procurementCommand = true;
    }
  }

  const oldMovements = toMap(previous.movements);
  const newMovements = (next.movements || []).filter((item) => !oldMovements.has(item.id));
  if (newMovements.length && !transactionCommand && !procurementCommand) {
    for (const movement of newMovements) {
      await api('/inventory/movements', { method: 'POST', body: { id: movement.id, date: movement.date, productId: movement.productId, type: movement.type, quantity: movement.quantity, reference: movement.reference && movement.reference !== 'MANUAL' ? movement.reference : '', remarks: movement.remarks || '', supplier: movement.supplier || '' } });
      count++;
    }
  }

  count += await syncCollection(previous.products, next.products, '/products', {
    user, api, adminOnly: true,
    omit: ['quantity', 'updatedAt'],
    createTransform: (item) => clean(item, ['quantity', 'updatedAt', 'createdAt', 'password']),
    updateTransform: (item) => clean(item, ['id', 'quantity', 'updatedAt', 'createdAt', 'password']),
  });
  count += await syncCollection(previous.customers, next.customers, '/customers', {
    user, api, adminOnly: true,
    omit: ['createdAt'],
    createTransform: (item) => clean(item, ['password']), updateTransform: (item) => clean(item, ['id', 'password']),
  });
  count += await syncCollection(previous.suppliers, next.suppliers, '/suppliers', {
    user, api, adminOnly: true,
    omit: ['createdAt'],
    createTransform: (item) => clean(item, ['password']), updateTransform: (item) => clean(item, ['id', 'password']),
  });
  count += await syncCollection(previous.records, next.records, '/records', {
    user, api, omit: ['uploadedBy'],
    createTransform: (item) => clean(item, ['uploadedBy', 'password']), updateTransform: (item) => clean(item, ['id', 'uploadedBy', 'password']),
  });
  count += await syncCollection(previous.users, next.users, '/users', {
    user, api, adminOnly: true,
    omit: ['createdAt', 'lastLogin'],
    createTransform: (item) => clean(item, ['lastLogin']), updateTransform: (item) => clean(item, ['id', 'password', 'createdAt', 'lastLogin']),
  });

  for (const role of ['Administrator', 'Manager/Owner', 'Staff']) {
    if (JSON.stringify(previous.permissions?.[role] || {}) !== JSON.stringify(next.permissions?.[role] || {})) {
      await api(`/permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: { pages: next.permissions[role] } });
      count++;
    }
  }
  if (hasChanged(previous.settings, next.settings, ['profile'])) {
    const keys = changedKeys(previous.settings, next.settings, ['profile']);
    if (keys.length) {
      const body = {};
      for (const key of keys) if (['dateFormat', 'timeFormat', 'reportFormat', 'confirmDelete', 'notifications'].includes(key)) body[key] = next.settings[key];
      if (Object.keys(body).length) { await api('/settings', { method: 'PATCH', body }); count++; }
    }
  }
  return count;
}
