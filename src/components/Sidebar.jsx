import React from 'react';
import { Boxes, LogOut, Activity } from 'lucide-react';
import { getNavigationGroups } from '../data/navigation.js';

const initials = (value = '') => value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export default function Sidebar({ activePage, onNavigate, user, permissions, onLogout }) {
  const groups = getNavigationGroups(user?.role, permissions);
  return (
    <aside className="sidebar" aria-label="Application sidebar">
      <div className="brand-lockup">
        <div className="brand-lockup__mark" aria-hidden="true"><Boxes size={22} /></div>
        <div className="brand-lockup__text"><strong>JOZETH TRADING</strong><span>Business Operations and Records</span></div>
      </div>
      <div className="sidebar__divider" />
      <nav className="sidebar-nav" aria-label="Main navigation">
        {groups.map((group) => (
          <div className="sidebar-nav__group" key={group.label}>
            <p className="sidebar-nav__label">{group.label}</p>
            {group.items.map(({ label, icon: Icon }) => {
              const selected = activePage === label;
              return <button key={label} type="button" className={`sidebar-nav__item ${selected ? 'is-active' : ''}`} onClick={() => onNavigate(label)} aria-current={selected ? 'page' : undefined} title={label}>
                <Icon size={15} strokeWidth={1.9} aria-hidden="true" /><span>{label}</span>
              </button>;
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-account">
        <div className="sidebar-account__profile">
          <div className="sidebar-account__avatar">{initials(user?.name || 'User')}</div>
          <div className="sidebar-account__identity"><strong>{user?.name || 'User'}</strong><span>{user?.role || 'Staff'}</span></div>
        </div>
        <div className="sidebar-account__status"><Activity size={12} /><span>Local demo · changes saved here</span></div>
        <button type="button" className="sidebar-account__logout" onClick={onLogout}><LogOut size={14} /><span>Log out</span></button>
      </div>
    </aside>
  );
}
