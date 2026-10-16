import React from 'react';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';

export default function AppLayout({ user, activePage, permissions, onNavigate, searchValue, onSearchChange, onNotify, onLogout, children }) {
  return <div className="app-shell">
    <Sidebar activePage={activePage} onNavigate={onNavigate} user={user} permissions={permissions} onLogout={onLogout} />
    <div className="app-main">
      <Header user={user} searchValue={searchValue} onSearchChange={onSearchChange} onNotify={onNotify} onLogout={onLogout} />
      <main className="main-content">{children}</main>
      <footer className="app-footer"><span>© {new Date().getFullYear()} JOZETH TRADING</span><span>Business Operations and Records Management System <b>•</b> Front-end demo</span></footer>
    </div>
  </div>;
}
