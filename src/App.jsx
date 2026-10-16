import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, X } from 'lucide-react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MasterDataPage from './pages/MasterDataPage.jsx';
import OperationsPage from './pages/OperationsPage.jsx';
import RecordsPage from './pages/RecordsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AdministrationPage from './pages/AdministrationPage.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import { createInitialData } from './data/seedData.js';
import { getAllowedPages } from './data/navigation.js';
import { apiRequest, fetchBootstrap, syncStateDiff } from './services/api.js';

export default function App() {
  const [data, setData] = useState(createInitialData);
  const dataRef = useRef(data);
  const currentUserRef = useRef(null);
  const syncQueue = useRef(Promise.resolve());
  const revisionRef = useRef(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [activePage, setActivePage] = useState('Dashboard');
  const [searchValue, setSearchValue] = useState('');
  const [toast, setToast] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState('');
  const toastTimer = useRef(null);
  const allowedPages = currentUser ? getAllowedPages(currentUser.role, data.permissions) : [];

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.dataset.dateFormat = data.settings?.dateFormat || 'MMM DD, YYYY';
  }, [data.settings?.dateFormat]);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        const result = await apiRequest('/auth/me');
        const user = result.user;
        const fresh = await fetchBootstrap();
        if (cancelled) return;
        currentUserRef.current = user;
        dataRef.current = fresh;
        setCurrentUser(user);
        setData(fresh);
        setActivePage('Dashboard');
        setApiUnavailable('');
      } catch (error) {
        if (cancelled) return;
        if (error.status !== 401) setApiUnavailable(error.message || 'Cannot reach the backend. Start the API and database, then reload.');
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    }
    restoreSession();
    return () => { cancelled = true; };
  }, []);

  function notify(message, tone = 'success') {
    setToast({ message, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }

  async function handleLogin(identifier, password, rememberMe) {
    setApiUnavailable('');
    const result = await apiRequest('/auth/login', { method: 'POST', body: { identifier, password, rememberMe } });
    const user = result.user;
    const fresh = await fetchBootstrap();
    currentUserRef.current = user;
    dataRef.current = fresh;
    setCurrentUser(user);
    setData(fresh);
    setActivePage('Dashboard');
    setSearchValue('');
    setToast(null);
    notify(`Welcome, ${user.name}.`);
  }

  async function handleLogout() {
    revisionRef.current += 1;
    try { await apiRequest('/auth/logout', { method: 'POST', body: {} }); } catch { /* Clear the local shell even if the session has expired. */ }
    currentUserRef.current = null;
    setCurrentUser(null);
    setActivePage('Dashboard');
    setSearchValue('');
    setToast(null);
    dataRef.current = createInitialData();
    setData(createInitialData());
  }

  function setDataRemote(updater) {
    const previous = dataRef.current;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    if (!next || next === previous) return;
    const revision = ++revisionRef.current;
    dataRef.current = next;
    setData(next);
    const actor = currentUserRef.current;
    syncQueue.current = syncQueue.current.then(async () => {
      try {
        const changedCount = await syncStateDiff(previous, next, actor);
        if (changedCount > 0) {
          const fresh = await fetchBootstrap();
          if (revisionRef.current !== revision) return;
          setApiUnavailable('');
          dataRef.current = fresh;
          setData(fresh);
          const freshUser = fresh.users.find((item) => item.id === actor?.id);
          if (freshUser && freshUser.name !== currentUserRef.current?.name) {
            currentUserRef.current = { ...currentUserRef.current, ...freshUser };
            setCurrentUser((old) => old ? { ...old, ...freshUser } : old);
          }
        }
      } catch (error) {
        notify(error.message || 'Could not save to the database. Reloading the latest saved data.', 'error');
        try {
          const fresh = await fetchBootstrap();
          if (revisionRef.current !== revision) return;
          dataRef.current = fresh;
          setData(fresh);
          const freshUser = fresh.users.find((item) => item.id === actor?.id);
          if (freshUser) { currentUserRef.current = freshUser; setCurrentUser(freshUser); }
        } catch (refreshError) {
          if (refreshError.status === 401) await handleLogout();
          else setApiUnavailable('The backend connection was lost. Your most recent action may not have saved. Check the API and database, then reload.');
        }
      }
    });
  }

  function navigate(page) {
    if (!currentUser) return;
    const currentAllowed = getAllowedPages(currentUser.role, data.permissions);
    if (!currentAllowed.includes(page)) { notify('Your current role does not have access to that module.', 'error'); return; }
    setActivePage(page);
    setSearchValue('');
  }

  function updateCurrentUser(user) {
    currentUserRef.current = user;
    setCurrentUser(user);
  }

  if (authChecking) return <main className="auth-loading"><div><LoaderCircle className="spin" size={28} /><strong>Connecting to JOZETH TRADING</strong><span>Checking the secure session…</span></div></main>;
  if (!currentUser) return <Login onLogin={handleLogin} apiUnavailable={apiUnavailable} />;

  let page;
  if (activePage === 'Dashboard') page = <Dashboard searchValue={searchValue} notify={notify} onNavigate={navigate} user={currentUser} data={data} allowedPages={allowedPages} />;
  else if (['Products', 'Customers', 'Suppliers'].includes(activePage)) page = <MasterDataPage title={activePage} data={data} setData={setDataRemote} user={currentUser} searchValue={searchValue} notify={notify} />;
  else if (['Sales & Transactions', 'Inventory', 'Procurement'].includes(activePage)) page = <OperationsPage title={activePage} data={data} setData={setDataRemote} user={currentUser} searchValue={searchValue} notify={notify} />;
  else if (activePage === 'Records Management') page = <RecordsPage data={data} setData={setDataRemote} user={currentUser} searchValue={searchValue} notify={notify} />;
  else if (activePage === 'Reports') page = <ReportsPage data={data} searchValue={searchValue} notify={notify} />;
  else if (activePage === 'Settings') page = <SettingsPage data={data} setData={setDataRemote} user={currentUser} onUpdateCurrentUser={updateCurrentUser} notify={notify} />;
  else if (['User Management', 'Role & Permissions'].includes(activePage)) page = <AdministrationPage title={activePage} data={data} setData={setDataRemote} currentUser={currentUser} onUpdateCurrentUser={updateCurrentUser} searchValue={searchValue} notify={notify} />;
  else page = <Dashboard searchValue={searchValue} notify={notify} onNavigate={navigate} user={currentUser} data={data} allowedPages={allowedPages} />;

  return <AppLayout user={currentUser} activePage={activePage} permissions={data.permissions} onNavigate={navigate} searchValue={searchValue} onSearchChange={setSearchValue} onNotify={() => notify(`You have ${data.products.filter((item) => item.quantity <= item.reorderLevel).length} product(s) at or below reorder level and ${data.procurements.filter((item) => ['Draft', 'Pending', 'Approved', 'Ordered'].includes(item.status)).length} open procurement request(s).`, 'info')} onLogout={handleLogout}>
    {apiUnavailable && <div className="inline-note inline-note--error" role="alert">{apiUnavailable}</div>}
    {page}
    {toast && <div className={`toast toast--${toast.tone}`} role="status"><CheckCircle2 size={17} aria-hidden="true" /><span>{toast.message}</span><button type="button" aria-label="Dismiss message" onClick={() => setToast(null)}><X size={15} /></button></div>}
  </AppLayout>;
}
