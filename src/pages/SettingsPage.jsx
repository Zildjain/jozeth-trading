import React, { useEffect, useState } from 'react';
import { Bell, LockKeyhole, Settings, Save, ShieldCheck, UserRound } from 'lucide-react';
import Button from '../components/Button.jsx';
import PageHeading from '../components/PageHeading.jsx';
import { addActivity, todayISO } from '../utils/helpers.js';
import { apiRequest } from '../services/api.js';

const sections = [
  { id: 'Profile', icon: UserRound, description: 'Name and contact details' },
  { id: 'Security', icon: LockKeyhole, description: 'Password for this account' },
  { id: 'Notifications', icon: Bell, description: 'Choose what to show in alerts' },
  { id: 'Preferences', icon: Settings, description: 'Basic display and report behavior' },
  { id: 'System Information', icon: ShieldCheck, description: 'Application build details' },
];

export default function SettingsPage({ data, setData, user, onUpdateCurrentUser, notify }) {
  const [section, setSection] = useState('Profile');
  const [profile, setProfile] = useState({ name: user.name || '', username: user.username || '', email: user.email || '', contact: user.contact || '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [preferences, setPreferences] = useState({ dateFormat: data.settings?.dateFormat || 'YYYY-MM-DD', timeFormat: data.settings?.timeFormat || '12-hour', reportFormat: data.settings?.reportFormat || 'CSV', confirmDelete: data.settings?.confirmDelete ?? true });
  const [notifications, setNotifications] = useState({ transactions: true, lowStock: true, procurement: true, system: true, ...(data.settings?.notifications || {}) });
  const [error, setError] = useState('');

  useEffect(() => {
    setProfile({ name: user.name || '', username: user.username || '', email: user.email || '', contact: user.contact || '' });
  }, [user.id, user.name, user.username, user.email, user.contact]);

  function saveProfile(event) {
    event.preventDefault(); setError('');
    if (!profile.name.trim() || !profile.username.trim() || !profile.email.trim()) { setError('Name, username and email are required.'); return; }
    const duplicate = data.users.find((item) => item.id !== user.id && (item.username.toLowerCase() === profile.username.trim().toLowerCase() || item.email.toLowerCase() === profile.email.trim().toLowerCase()));
    if (duplicate) { setError('That username or email address is already assigned to another account.'); return; }
    const updated = { ...user, ...profile, name: profile.name.trim(), username: profile.username.trim(), email: profile.email.trim(), contact: profile.contact.trim() };
    setData((current) => addActivity({ ...current, users: current.users.map((item) => item.id === user.id ? { ...item, ...profile, name: profile.name.trim(), username: profile.username.trim(), email: profile.email.trim(), contact: profile.contact.trim() } : item) }, 'Profile updated', `${updated.name} changed their profile details.`, 'blue'));
    onUpdateCurrentUser(updated); notify('Profile saved.');
  }

  async function savePassword(event) {
    event.preventDefault(); setError('');
    if (passwordForm.next.length < 12 || !/[a-z]/.test(passwordForm.next) || !/[A-Z]/.test(passwordForm.next) || !/[0-9]/.test(passwordForm.next) || !/[^A-Za-z0-9]/.test(passwordForm.next)) { setError('Use at least 12 characters with uppercase, lowercase, a number, and a symbol.'); return; }
    if (passwordForm.next !== passwordForm.confirm) { setError('New password and confirmation do not match.'); return; }
    try {
      await apiRequest('/auth/change-password', { method: 'POST', body: { currentPassword: passwordForm.current, newPassword: passwordForm.next } });
      setPasswordForm({ current: '', next: '', confirm: '' }); notify('Password changed successfully on the server.');
    } catch (err) { setError(err.message || 'Could not change password.'); }
  }

  function savePreferences() {
    setData((current) => addActivity({ ...current, settings: { ...current.settings, ...preferences } }, 'System preferences saved', `${user.name} updated preferences.`, 'blue'));
    notify('Preferences saved.');
  }
  function saveNotifications() {
    setData((current) => ({ ...current, settings: { ...current.settings, notifications } }));
    notify('Notification preferences saved.');
  }

  return <>
    <PageHeading eyebrow="ACCOUNT" title="Settings" description="Manage your profile, password security, notifications, and basic system preferences." />
    <div className="settings-layout"><aside className="panel settings-nav">{sections.map(({ id, icon: Icon, description }) => <button key={id} type="button" className={`settings-nav__item ${section === id ? 'is-active' : ''}`} onClick={() => { setSection(id); setError(''); }}><Icon size={17} /><span><strong>{id}</strong><small>{description}</small></span></button>)}</aside>
      <section className="panel settings-main">
        {section === 'Profile' && <><div className="settings-panel-heading"><div className="settings-panel-icon"><UserRound size={19} /></div><div><h2>Profile information</h2><p>Update the account information displayed in the application.</p></div></div><form className="form-grid" onSubmit={saveProfile}><div className="form-field"><label>Full name *</label><input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} required /></div><div className="form-field"><label>Username *</label><input value={profile.username} onChange={(event) => setProfile((current) => ({ ...current, username: event.target.value }))} required /></div><div className="form-field"><label>Email address *</label><input type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} required /></div><div className="form-field"><label>Contact number</label><input value={profile.contact} onChange={(event) => setProfile((current) => ({ ...current, contact: event.target.value }))} /></div><div className="form-field"><label>Assigned role</label><div className="readonly-value">{user.role}</div></div><div className="form-field"><label>Account status</label><div className="readonly-value">Active</div></div>{error && <div className="form-error form-field--full">{error}</div>}<div className="form-actions form-field--full"><Button type="submit"><Save size={14} /> Save profile</Button></div></form></>}
        {section === 'Security' && <><div className="settings-panel-heading"><div className="settings-panel-icon"><LockKeyhole size={19} /></div><div><h2>Password security</h2><p>This updates your password on the server. Your password hash is never sent to the browser.</p></div></div><form className="form-grid" onSubmit={savePassword}><div className="form-field form-field--full"><label>Current password *</label><input type="password" value={passwordForm.current} onChange={(event) => setPasswordForm((current) => ({ ...current, current: event.target.value }))} autoComplete="current-password" required /></div><div className="form-field"><label>New password *</label><input type="password" value={passwordForm.next} onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))} minLength={12} autoComplete="new-password" required /></div><div className="form-field"><label>Confirm new password *</label><input type="password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))} minLength={12} autoComplete="new-password" required /></div><div className="security-note form-field--full"><ShieldCheck size={16} /><span>Use at least 12 characters and include uppercase, lowercase, a number, and a symbol. The server hashes the password before saving it.</span></div>{error && <div className="form-error form-field--full">{error}</div>}<div className="form-actions form-field--full"><Button type="submit"><LockKeyhole size={14} /> Change password</Button></div></form></>}
        {section === 'Notifications' && <><div className="settings-panel-heading"><div className="settings-panel-icon"><Bell size={19} /></div><div><h2>Notification preferences</h2><p>Choose which system notifications are enabled for your account.</p></div></div><div className="preference-list">{[{ key: 'transactions', title: 'Transaction notifications', text: 'Show feedback after sales and transaction updates.' }, { key: 'lowStock', title: 'Low-stock alerts', text: 'Highlight products at or below their reorder level.' }, { key: 'procurement', title: 'Procurement updates', text: 'Show notifications when requests advance or are received.' }, { key: 'system', title: 'System notifications', text: 'Show basic local application messages.' }].map((item) => <label className="preference-row" key={item.key}><span><strong>{item.title}</strong><small>{item.text}</small></span><input type="checkbox" checked={Boolean(notifications[item.key])} onChange={(event) => setNotifications((current) => ({ ...current, [item.key]: event.target.checked }))} /></label>)}</div><div className="form-actions"><Button onClick={saveNotifications}><Save size={14} /> Save notification settings</Button></div></>}
        {section === 'Preferences' && <><div className="settings-panel-heading"><div className="settings-panel-icon"><Settings size={19} /></div><div><h2>System preferences</h2><p>Preferences are saved to your database account and used by supported screens.</p></div></div><div className="form-grid"><div className="form-field"><label>Date format</label><select value={preferences.dateFormat} onChange={(event) => setPreferences((current) => ({ ...current, dateFormat: event.target.value }))}><option>MMM DD, YYYY</option><option>YYYY-MM-DD</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></div><div className="form-field"><label>Time format</label><select value={preferences.timeFormat} onChange={(event) => setPreferences((current) => ({ ...current, timeFormat: event.target.value }))}><option>12-hour</option><option>24-hour</option></select></div><div className="form-field"><label>Default report format</label><select value={preferences.reportFormat} onChange={(event) => setPreferences((current) => ({ ...current, reportFormat: event.target.value }))}><option>CSV</option><option>PDF</option></select></div><label className="checkbox-line form-field--full"><input type="checkbox" checked={preferences.confirmDelete} onChange={(event) => setPreferences((current) => ({ ...current, confirmDelete: event.target.checked }))} /><span>Confirm before archiving records</span></label><div className="form-actions form-field--full"><Button onClick={savePreferences}><Save size={14} /> Save preferences</Button></div></div></>}
        {section === 'System Information' && <><div className="settings-panel-heading"><div className="settings-panel-icon"><ShieldCheck size={19} /></div><div><h2>System information</h2><p>Details for the current full-stack development build.</p></div></div><div className="system-info-list"><Info label="System name" value="JOZETH TRADING" /><Info label="Application" value="Business Operations and Records Management System" /><Info label="Version" value="2.0.0 (Full-stack demo)" /><Info label="Technology" value="React · Express · Node.js · MongoDB · Mongoose" /><Info label="Environment" value="Local development environment" /><Info label="Data storage" value="MongoDB via authenticated Express API" /><Info label="Last updated" value={todayISO()} /><Info label="Scope note" value="No accounting, payroll, VAT/tax calculations, online payments, or government integrations." /></div></>}
      </section>
    </div>
  </>;
}
function Info({ label, value }) { return <div className="system-info-row"><span>{label}</span><strong>{value}</strong></div>; }
