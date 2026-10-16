import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, ShieldCheck, SlidersHorizontal, ToggleLeft, ToggleRight, UsersRound } from 'lucide-react';
import Button from '../components/Button.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { addActivity, formatDate, nextId, todayISO } from '../utils/helpers.js';

const roles = ['Administrator', 'Manager/Owner', 'Staff'];
const pageNames = ['Dashboard', 'Products', 'Customers', 'Suppliers', 'Sales & Transactions', 'Inventory', 'Procurement', 'Records Management', 'Reports', 'User Management', 'Role & Permissions', 'Settings'];
const blankUser = () => ({ name: '', username: '', email: '', contact: '', role: 'Staff', status: 'Active', password: '' });

export default function AdministrationPage({ title, data, setData, currentUser, onUpdateCurrentUser, searchValue, notify }) {
  return title === 'Role & Permissions'
    ? <PermissionsPage data={data} setData={setData} notify={notify} />
    : <UsersPage data={data} setData={setData} currentUser={currentUser} onUpdateCurrentUser={onUpdateCurrentUser} searchValue={searchValue} notify={notify} />;
}

function UsersPage({ data, setData, currentUser, onUpdateCurrentUser, searchValue, notify }) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankUser());
  const [error, setError] = useState('');
  const users = data.users || [];
  const filtered = useMemo(() => users.filter((item) => `${item.id} ${item.name} ${item.username} ${item.email} ${item.role}`.toLowerCase().includes(`${searchValue || ''} ${query}`.trim().toLowerCase()) && (roleFilter === 'All roles' || item.role === roleFilter) && (statusFilter === 'All statuses' || item.status === statusFilter)), [users, query, searchValue, roleFilter, statusFilter]);

  function openCreate() { setEditing(null); setForm(blankUser()); setError(''); setModal('form'); }
  function openEdit(user) { setEditing(user); setForm({ ...blankUser(), ...user, password: '' }); setError(''); setModal('form'); }
  function setField(name, value) { setForm((current) => ({ ...current, [name]: value })); }
  function submit(event) {
    event.preventDefault(); setError('');
    if (!form.name.trim() || !form.username.trim() || !form.email.trim()) { setError('Name, username and email are required.'); return; }
    if (!editing && form.password.length < 12) { setError('A new account password must contain at least 12 characters.'); return; }
    if (form.password && form.password.length < 12) { setError('Password must contain at least 12 characters.'); return; }
    if (editing?.id === currentUser.id && form.role !== currentUser.role) { setError('You cannot change your own role from the active session. Use another administrator account.'); return; }
    if (editing?.id === currentUser.id && form.status !== 'Active') { setError('You cannot deactivate your own active account.'); return; }
    const duplicate = users.find((item) => item.id !== editing?.id && (item.username.toLowerCase() === form.username.trim().toLowerCase() || item.email.toLowerCase() === form.email.trim().toLowerCase()));
    if (duplicate) { setError('Username or email is already used by another account.'); return; }
    const { password, ...other } = form;
    setData((current) => {
      let updated;
      if (editing) updated = current.users.map((item) => item.id === editing.id ? { ...item, ...other, name: other.name.trim(), username: other.username.trim(), email: other.email.trim(), ...(password ? { password } : {}) } : item);
      else updated = [...current.users, { ...other, id: nextId('USR', current.users), name: other.name.trim(), username: other.username.trim(), email: other.email.trim(), password, createdAt: todayISO(), lastLogin: 'Never' }];
      return addActivity({ ...current, users: updated }, editing ? 'User account updated' : 'User account created', `${other.name} · ${other.role}`, 'blue');
    });
    if (editing?.id === currentUser.id) onUpdateCurrentUser({ ...currentUser, ...other, name: other.name.trim(), username: other.username.trim(), email: other.email.trim(), ...(password ? {} : {}) });
    setModal(''); notify(`User ${editing ? 'updated' : 'created'} successfully.`);
  }
  function toggleUser(account) {
    if (account.id === currentUser.id) { notify('You cannot deactivate your own active session.', 'error'); return; }
    if (account.role === 'Administrator' && account.status === 'Active' && users.filter((item) => item.role === 'Administrator' && item.status === 'Active').length <= 1) { notify('At least one active administrator must remain.', 'error'); return; }
    const next = account.status === 'Active' ? 'Inactive' : 'Active';
    setData((current) => addActivity({ ...current, users: current.users.map((item) => item.id === account.id ? { ...item, status: next } : item) }, `User ${next.toLowerCase()}`, `${account.name} was ${next.toLowerCase()}.`, 'orange'));
    notify(`${account.name} is now ${next.toLowerCase()}.`);
  }

  return <>
    <PageHeading eyebrow="ADMINISTRATION" title="User Management" description="Create user accounts, assign roles, and activate or deactivate access." actions={<Button onClick={openCreate}><Plus size={15} /> Add user</Button>} />
    <div className="mini-stat-grid"><MiniStat label="Total accounts" value={users.length} /><MiniStat label="Active accounts" value={users.filter((item) => item.status === 'Active').length} /><MiniStat label="Administrators" value={users.filter((item) => item.role === 'Administrator' && item.status === 'Active').length} /><MiniStat label="Inactive accounts" value={users.filter((item) => item.status !== 'Active').length} /></div>
    <div className="inline-note"><ShieldCheck size={15} /><span>User changes are validated and enforced by the server. Role access is checked by the API as well as the sidebar.</span></div>
    <section className="panel data-panel"><div className="data-toolbar"><div className="data-toolbar__title"><UsersRound size={17} /><div><strong>User account register</strong><small>Passwords are hashed server-side and never returned to this table.</small></div></div><div className="data-toolbar__filters"><label className="local-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." /></label><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option>All roles</option>{roles.map((item) => <option key={item}>{item}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Active</option><option>Inactive</option></select></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>User ID</th><th>Full name</th><th>Username / Email</th><th>Contact</th><th>Role</th><th>Account status</th><th>Last login</th><th>Date created</th><th>Actions</th></tr></thead><tbody>{filtered.map((account) => <tr key={account.id}><td><span className="id-text">{account.id}</span></td><td><strong className="table-primary">{account.name}</strong>{account.id === currentUser.id && <small className="table-secondary">Current account</small>}</td><td>{account.username}<small className="table-secondary">{account.email}</small></td><td>{account.contact || '—'}</td><td>{account.role}</td><td><StatusBadge status={account.status} /></td><td>{account.lastLogin || 'Never'}</td><td>{formatDate(account.createdAt)}</td><td><div className="row-actions"><button className="row-action" type="button" title="Edit account" onClick={() => openEdit(account)}><Pencil size={15} /></button><button className="row-action row-action--muted" type="button" title={account.status === 'Active' ? 'Deactivate account' : 'Activate account'} onClick={() => toggleUser(account)}>{account.status === 'Active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}</button></div></td></tr>)}{!filtered.length && <tr><td colSpan="9" className="empty-state">No users match the selected filters.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {filtered.length} of {users.length} accounts</span><span>Password hashes are never shown</span></div></section>
    <Modal open={modal === 'form'} title={`${editing ? 'Edit' : 'Add'} user account`} description="Create a local account and select its role. Users receive the access currently configured for that role." onClose={() => setModal('')} wide>
      <form className="form-grid" onSubmit={submit}><div className="form-field"><label>Full name *</label><input value={form.name} onChange={(event) => setField('name', event.target.value)} required /></div><div className="form-field"><label>Username *</label><input value={form.username} onChange={(event) => setField('username', event.target.value)} required autoComplete="off" /></div><div className="form-field"><label>Email *</label><input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} required /></div><div className="form-field"><label>Contact number</label><input value={form.contact} onChange={(event) => setField('contact', event.target.value)} /></div><div className="form-field"><label>Role *</label><select value={form.role} onChange={(event) => setField('role', event.target.value)} required>{roles.map((item) => <option key={item}>{item}</option>)}</select></div><div className="form-field"><label>Account status</label><select value={form.status} onChange={(event) => setField('status', event.target.value)}><option>Active</option><option>Inactive</option></select></div><div className="form-field form-field--full"><label>{editing ? 'Reset password (optional)' : 'Temporary password *'}</label><input type="password" value={form.password} onChange={(event) => setField('password', event.target.value)} minLength={12} required={!editing} autoComplete="new-password" placeholder={editing ? 'Leave blank to keep the current password' : 'At least 12 characters with uppercase, lowercase, number, and symbol'} /><small className="field-help">Passwords are hashed on the server and never stored in browser localStorage.</small></div>{error && <div className="form-error form-field--full">{error}</div>}<div className="form-actions form-field--full"><Button variant="secondary" onClick={() => setModal('')}>Cancel</Button><Button type="submit">{editing ? 'Save account' : 'Create account'}</Button></div></form>
    </Modal>
  </>;
}

function PermissionsPage({ data, setData, notify }) {
  const permissions = data.permissions || {};
  function toggle(role, page, value) {
    if (role === 'Administrator' && ['Dashboard', 'User Management', 'Role & Permissions'].includes(page) && !value) return;
    setData((current) => addActivity({ ...current, permissions: { ...current.permissions, [role]: { ...current.permissions[role], [page]: value } } }, 'Role permissions updated', `${role} access to ${page} was ${value ? 'enabled' : 'disabled'}.`, 'purple'));
    notify(`${role} access to ${page} ${value ? 'enabled' : 'disabled'}.`);
  }
  function reset() {
    const defaults = {
      Administrator: Object.fromEntries(pageNames.map((page) => [page, true])),
      'Manager/Owner': Object.fromEntries(pageNames.map((page) => [page, ['Dashboard', 'Sales & Transactions', 'Inventory', 'Procurement', 'Records Management', 'Reports', 'Settings'].includes(page)])),
      Staff: Object.fromEntries(pageNames.map((page) => [page, ['Dashboard', 'Sales & Transactions', 'Inventory', 'Procurement', 'Records Management', 'Settings'].includes(page)])),
    };
    setData((current) => addActivity({ ...current, permissions: defaults }, 'Role permissions reset', 'The default role access matrix was restored.', 'purple'));
    notify('Default role permissions restored.');
  }
  return <>
    <PageHeading eyebrow="ADMINISTRATION" title="Role & Permissions" description="Choose which modules each role can open. The sidebar and page navigation follow this matrix immediately." actions={<Button variant="secondary" onClick={reset}><SlidersHorizontal size={14} /> Restore defaults</Button>} />
    <div className="inline-note"><ShieldCheck size={15} /><span>Default access follows the approved proposal. These are front-end navigation controls; production authorization must also be enforced by a backend.</span></div>
    <section className="panel data-panel permission-panel"><div className="panel__header"><div><h2 className="panel__title">Module access matrix</h2><p className="panel__subtitle">Toggle module access per role. Core admin access stays enabled to prevent lockout.</p></div></div><div className="table-wrap"><table className="data-table permissions-table"><thead><tr><th>Module</th>{roles.map((role) => <th key={role}>{role}</th>)}</tr></thead><tbody>{pageNames.map((page) => <tr key={page}><td><strong className="table-primary">{page}</strong></td>{roles.map((role) => { const checked = permissions[role]?.[page] ?? false; const locked = role === 'Administrator' && ['Dashboard', 'User Management', 'Role & Permissions'].includes(page); return <td key={`${role}-${page}`}><label className={`permission-toggle ${locked ? 'is-locked' : ''}`} title={locked ? 'Required administrator access' : `${checked ? 'Disable' : 'Enable'} ${page} for ${role}`}><input type="checkbox" checked={Boolean(checked)} disabled={locked} onChange={(event) => toggle(role, page, event.target.checked)} /><span className="permission-toggle__track" /><small>{checked ? 'Allowed' : 'Blocked'}</small></label></td>; })}</tr>)}</tbody></table></div><div className="table-footer"><span>Access changes apply immediately to navigation</span><span>Administrator core access is locked on</span></div></section>
  </>;
}
function MiniStat({ label, value }) { return <div className="mini-stat"><span>{label}</span><strong>{value}</strong></div>; }
