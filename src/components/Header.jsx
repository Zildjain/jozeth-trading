import React from 'react';
import { Bell, Search, ChevronDown, LogOut } from 'lucide-react';

export default function Header({ user, searchValue, onSearchChange, onNotify, onLogout }) {
  const initials = (user?.name || 'User').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <header className="topbar">
      <div className="topbar__title"><span>JOZETH TRADING</span><small>Business Operation Dashboard</small></div>
      <div className="topbar__tools">
        <label className="topbar__search-wrap"><Search size={15} /><input aria-label="Search current page" placeholder="Search records..." value={searchValue} onChange={(event) => onSearchChange(event.target.value)} /><kbd>⌕</kbd></label>
        <button type="button" className="icon-button notification-button" aria-label="Notifications" onClick={onNotify}><Bell size={17} /><span className="notification-button__dot" /></button>
        <div className="topbar__profile"><span className="topbar__avatar">{initials}</span><span className="topbar__profile-copy"><strong>{user?.name}</strong><small>{user?.role}</small></span><ChevronDown size={13} /></div><button type="button" className="header-logout" onClick={onLogout} title="Log out"><LogOut size={13} /><span>Log out</span></button>
      </div>
    </header>
  );
}
