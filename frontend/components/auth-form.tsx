'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import AuthLayout from './auth-layout';
import Field from './field';
import { Button } from './ui/button';
import { reportError, reportSuccess } from '@/lib/form-feedback';
import { ApiError, api } from '@/features/workspace/api';
type Mode = 'login' | 'register' | 'forgot' | 'reset';
export default function AuthForm({ mode, token = '', initialEmail = '' }: { mode: Mode; token?: string; initialEmail?: string }) {
 const router = useRouter();
 const [data, setData] = useState({ name: '', business: '', email: initialEmail, password: '', password_confirmation: '', remember: false });
 const [busy, setBusy] = useState(false);
 const [ready, setReady] = useState(false);
 const [demo, setDemo] = useState(false);
 const [error, setError] = useState('');
 const [status, setStatus] = useState('');
 const [errors, setErrors] = useState<Record<string, string>>({});
 async function bootstrap() {
  setError('');
  try { const session = await api<{ user: unknown; demo_available: boolean }>('session'); setDemo(session.demo_available); setReady(true); if (session.user && (mode === 'login' || mode === 'register')) router.replace('/app/'); }
  catch (e) { setError((e as Error).message); }
 }
 useEffect(() => { void bootstrap(); }, []);
 const titles = { login: 'Welcome to your workspace.', register: 'Make yourself at home.', forgot: 'A little help getting back in.', reset: 'Choose a new password.' };
 const descriptions = { login: 'Sign in and pick up the conversation.', register: 'Create a business account to get started.', forgot: 'Enter your email and we’ll send you a password reset link.', reset: 'Use at least 10 characters, including letters and numbers.' };
 const buttons = { login: 'Sign in', register: 'Create account', forgot: 'Send password reset link', reset: 'Reset password' };
 const paths = { login: 'login', register: 'register', forgot: 'forgot-password', reset: 'reset-password' };
 function field(name: 'name' | 'business' | 'email' | 'password' | 'password_confirmation', label: string, type = 'text') {
  return <Field name={name} label={label} type={type} required error={errors[name]} value={data[name]} onChange={e => { setData(previous => ({ ...previous, [name]: e.target.value })); setErrors(previous => ({ ...previous, [name]: '', ...(name === 'password' ? { password_confirmation: '' } : {}) })); setError(''); setStatus(''); }} minLength={type === 'password' && mode !== 'login' ? 10 : undefined} maxLength={name === 'name' || name === 'business' ? 100 : name === 'email' ? 255 : type === 'password' && mode !== 'login' ? 200 : undefined} autoComplete={name === 'password' ? (mode === 'login' ? 'current-password' : 'new-password') : name === 'password_confirmation' ? 'new-password' : name === 'business' ? 'organization' : name === 'email' ? 'username' : 'name'} />;
 }
 async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (busy || !ready) return;
  const form = event.currentTarget;
  const nextErrors: Record<string, string> = {};
  for (const control of Array.from(form.elements)) {
   if (control instanceof HTMLInputElement && !control.validity.valid) nextErrors[control.name] = control.validationMessage;
  }
  if (mode === 'register') {
   for (const name of ['name', 'business'] as const) if (!data[name].trim()) nextErrors[name] = 'Please fill out this field.';
  }
  if ((mode === 'register' || mode === 'reset') && data.password.length < 10) nextErrors.password = 'Use at least 10 characters.';
  if ((mode === 'register' || mode === 'reset') && !nextErrors.password && !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(data.password)) nextErrors.password = 'Include at least one letter and one number.';
  if ((mode === 'register' || mode === 'reset') && data.password !== data.password_confirmation) nextErrors.password_confirmation = 'The password confirmation does not match.';
  setErrors(nextErrors); setError(''); setStatus('');
  if (Object.keys(nextErrors).length) {
   reportError('Please check the highlighted fields.');
   (form.elements.namedItem(Object.keys(nextErrors)[0]) as HTMLInputElement)?.focus();
   return;
  }
  setBusy(true);
  try {
   await api(`auth/${paths[mode]}`, 'POST', mode === 'forgot' ? { email: data.email } : mode === 'reset' ? { email: data.email, token, password: data.password, password_confirmation: data.password_confirmation } : data);
   if (mode === 'forgot') { const message = 'If an account exists for that address, a password reset link has been sent.'; setStatus(message); reportSuccess(message); }
   else if (mode === 'reset') { setStatus('Your password has been reset. You can now sign in.'); reportSuccess('Your password has been reset. You can now sign in.'); setData(previous => ({ ...previous, password: '', password_confirmation: '' })); }
   else { reportSuccess(mode === 'register' ? 'Your account has been created. Welcome!' : 'You have signed in successfully.'); router.replace('/app/'); }
  } catch (e) {
   const fieldErrors = e instanceof ApiError ? Object.fromEntries(Object.entries(e.errors).map(([name, messages]) => [name, messages.join(' ')])) : {};
   setErrors(fieldErrors);
   setError((e as Error).message);
   (form.elements.namedItem(Object.keys(fieldErrors)[0] || '') as HTMLInputElement | null)?.focus();
  }
  finally { setBusy(false); }
 }
 async function openDemo() {
  setBusy(true); setError('');
  try { await api('auth/demo', 'POST'); router.replace('/app/'); }
  catch (e) { setError((e as Error).message); setBusy(false); }
 }
 return <AuthLayout><span className="eyebrow">{mode === 'forgot' || mode === 'reset' ? 'A FRESH START' : 'YOUR NEXT CHAPTER STARTS HERE'}</span><h2>{titles[mode]}</h2><p>{descriptions[mode]}</p>
 {error && <p role="alert" className="error-banner">{error}</p>}{status && <p role="status" className="auth-success">{status}</p>}
 {!ready && <button type="button" onClick={bootstrap}>Retry connection</button>}
 <form noValidate data-managed-validation="true" onSubmit={submit} aria-busy={busy}>
 {mode === 'register' && <>{field('name', 'Your name')}{field('business', 'Business name')}</>}
 {field('email', 'Email address', 'email')}
 {mode !== 'forgot' && field('password', mode === 'login' ? 'Password' : 'Password (10+ characters, including letters and numbers)', 'password')}
 {(mode === 'register' || mode === 'reset') && field('password_confirmation', 'Confirm password', 'password')}
 {mode === 'login' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}><label className="checkbox-label" style={{ margin: 0 }}><input type="checkbox" checked={data.remember} onChange={e => setData(previous => ({ ...previous, remember: e.target.checked }))} />Remember me</label><Link href="/forgot-password">Forgot password?</Link></div>}
 <Button disabled={busy || !ready}>{busy ? 'Please wait…' : buttons[mode]}<ArrowRight size={16} /></Button>
 </form>
 <p className="auth-switch">{mode === 'login' ? <>New here? <Link href="/register">Create an account</Link></> : <Link href="/login">Back to sign in</Link>}</p>
 {mode === 'login' && demo && <><div className="or"><span />OR TAKE A LOOK AROUND<span /></div><button type="button" className="demo-button" disabled={busy || !ready} onClick={openDemo}><Sparkles size={16} />Explore the demo workspace<ArrowRight size={16} /></button><p className="demo-description">No account needed. See what’s possible.</p></>}
 </AuthLayout>;
}
