import React, { useState } from 'react';
import { ArrowRight, Boxes, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, AlertTriangle } from 'lucide-react';
import '../styles/login.css';

export default function Login({ onLogin, apiUnavailable = '' }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!identifier.trim() || !password) { setError('Enter your username/email and password.'); return; }
    setBusy(true);
    try { await onLogin(identifier.trim(), password, rememberMe); }
    catch (err) { setError(err.message || 'Sign-in failed. Please try again.'); }
    finally { setBusy(false); }
  }

  return <main className="login-page">
    <section className="login-card">
      <aside className="login-brand-panel">
        <div className="login-brand"><div className="login-brand__logo"><Boxes size={26} /></div><div><strong>JOZETH TRADING</strong><span>Business Operations and Records Management</span></div></div>
        <div className="login-brand__content">
          <span className="login-eyebrow">BUSINESS MANAGEMENT SYSTEM</span>
          <h1>Everything your business needs, in one place.</h1>
          <p>Manage products, customers, sales, inventory, procurement, records and reports with validated server-side workflows.</p>
          <div className="login-feature"><span className="login-feature__icon"><ShieldCheck size={19} /></span><div><strong>Server-side access control</strong><span>Role rules are checked by the API, not just hidden in the interface.</span></div></div>
          <div className="login-feature"><span className="login-feature__icon"><Boxes size={19} /></span><div><strong>Connected database</strong><span>Business data is saved to MongoDB and shared across signed-in users.</span></div></div>
        </div>
        <div className="login-brand__footer">Business Operations and Records Management System</div>
      </aside>
      <section className="login-form-panel">
        <div className="login-form-heading"><span className="login-mobile-logo"><Boxes size={23} /></span><span className="login-eyebrow">WELCOME BACK</span><h2>Sign in to your account</h2><p>Enter your account credentials to continue.</p></div>
        {apiUnavailable && <div className="login-message login-message--error" role="alert"><AlertTriangle size={15} /> Backend unavailable: {apiUnavailable}</div>}
        <form className="login-form" onSubmit={submit}>
          <div className="login-field"><label htmlFor="login-identifier">Username or Email</label><div className="login-input-wrap"><UserRound size={17} aria-hidden="true" /><input id="login-identifier" name="identifier" value={identifier} onChange={(event) => { setIdentifier(event.target.value); setError(''); }} placeholder="Enter your username or email" autoComplete="username" maxLength={254} required /></div></div>
          <div className="login-field"><div className="login-field__label-row"><label htmlFor="login-password">Password</label></div><div className="login-input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} placeholder="Enter your password" autoComplete="current-password" maxLength={128} required /><button type="button" className="login-password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
          <label className="login-remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Remember me on this device (7 days)</span></label>
          {error && <div className="login-message login-message--error" role="alert">{error}</div>}
          <button type="submit" className="login-submit" disabled={busy}><span>{busy ? 'Signing in…' : 'Sign In'}</span><ArrowRight size={17} /></button>
        </form>
        <div className="login-demo-accounts"><div className="login-demo-accounts__heading"><strong>Demo accounts</strong><span>Local setup only</span></div><p className="login-demo-instructions">Initial demo usernames and passwords are listed in the project README. Password hashes are stored in MongoDB; credentials are not embedded in the browser bundle.</p></div>
        <p className="login-security-note"><ShieldCheck size={14} />HttpOnly session cookie · login rate limited · API validation enabled</p>
      </section>
    </section>
  </main>;
}
