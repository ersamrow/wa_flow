import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { parseSignupEvent } from './facebookSignup';

type Signup = { state: string; app_id: string; config_id: string; version: string };
type Assets = { waba_id: string; phone_number_id: string };
type Facebook = {
  init(options: { appId: string; version: string; xfbml: boolean; cookie: boolean }): void;
  login(callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>): void;
};
declare global { interface Window { FB?: Facebook } }
let sdkPromise: Promise<Facebook> | undefined;
function facebookSdk(): Promise<Facebook> {
  if (window.FB) return Promise.resolve(window.FB);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<Facebook>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    const timer = window.setTimeout(() => { script.remove(); reject(new Error('Facebook could not load. Check your connection or browser content blocker, then retry.')); }, 20000);
    script.onload = () => { window.clearTimeout(timer); if (window.FB) resolve(window.FB); else reject(new Error('Facebook could not initialize. Please retry.')); };
    script.onerror = () => { window.clearTimeout(timer); script.remove(); reject(new Error('Facebook could not load. Check your connection or browser content blocker, then retry.')); };
    document.head.appendChild(script);
  }).catch(error => { sdkPromise = undefined; throw error; });
  return sdkPromise;
}

export function WhatsAppConnect({ enabled, demo, connected, refresh }: { enabled: boolean; demo: boolean; connected: boolean; refresh: () => Promise<void> }) {
  const [generation, setGeneration] = useState(0);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'opening' | 'finishing' | 'connected' | 'error'>('loading');
  const [feedback, setFeedback] = useState('');
  const [retrySetup, setRetrySetup] = useState(false);
  const launch = useRef<(() => void) | null>(null);
  const finish = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || demo) return;
    if (window.location.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
      setReady(false); setPhase('error');
      setFeedback('Open this workspace using the public HTTPS domain configured in Meta before connecting WhatsApp. Facebook cannot connect from this local development address.');
      return;
    }
    let disposed = false;
    let active = false;
    let authorized = false;
    let codeSubmitted = false;
    let completing = false;
    let config: Signup | undefined;
    let assets: Assets | undefined;
    let timer: number | undefined;
    let expiry: number | undefined;
    setReady(false); setPhase('loading'); setFeedback('Preparing secure Facebook connection…'); setRetrySetup(false);
    const fail = (message: string) => { if (disposed) return; setPhase('error'); setFeedback(message); };
    const complete = async () => {
      if (disposed || !authorized || !assets || !config || completing) return;
      completing = true; active = false; window.clearTimeout(timer);
      setPhase('finishing'); setRetrySetup(false); setFeedback('Verifying your phone and connecting WhatsApp…');
      try {
        await api('integrations/whatsapp/signup/complete', 'POST', { state: config.state, ...assets });
        if (disposed) return;
        setPhase('connected'); setFeedback('WhatsApp connected. Send a message to your shop number and open Inbox.');
        await refresh();
      } catch (error) {
        if (!disposed) { setRetrySetup(true); fail((error as Error).message); }
      } finally { completing = false; }
    };
    finish.current = () => { void complete(); };
    const listener = (event: MessageEvent) => {
      if (!active) return;
      const message = parseSignupEvent(event.origin, event.data);
      if (!message) return;
      if (message.event === 'FINISH') {
        assets = message.assets;
        void complete();
      } else {
        active = false; window.clearTimeout(timer);
        fail(message.event === 'CANCEL' ? 'Connection cancelled. You can try again when ready.' : 'Facebook did not finish the standard Cloud API phone flow. Complete phone verification in Meta or contact the platform owner.');
      }
    };
    window.addEventListener('message', listener);
    Promise.all([api<Signup>('integrations/whatsapp/signup/start', 'POST', {}), facebookSdk()]).then(([settings, fb]) => {
      if (disposed) return;
      config = settings;
      fb.init({ appId: settings.app_id, version: settings.version, xfbml: false, cookie: true });
      setReady(true); setPhase('ready'); setFeedback('Sign in to Facebook, choose your business and phone, and approve access.');
      launch.current = () => {
        if (active || codeSubmitted || disposed) return;
        active = true; setPhase('opening'); setFeedback('Complete the connection in the Facebook window.');
        timer = window.setTimeout(() => { active = false; fail('Connection timed out. Click Start again to open a new signup session.'); }, 10 * 60 * 1000);
        try {
          fb.login(response => {
            if (disposed || !active || codeSubmitted) return;
            const code = response.authResponse?.code;
            if (!code) { active = false; window.clearTimeout(timer); fail('Facebook sign-in was cancelled or no authorization was granted. Allow popups and try again.'); return; }
            codeSubmitted = true;
            setFeedback('Facebook approved access. Completing your WhatsApp connection…');
            // Exchange immediately: Meta authorization codes are short lived and assets may arrive later.
            void api('integrations/whatsapp/signup/exchange', 'POST', { state: settings.state, code }).then(() => {
              if (disposed || !active) return;
              authorized = true; void complete();
            }).catch(error => { active = false; window.clearTimeout(timer); fail((error as Error).message); });
          }, { config_id: settings.config_id, response_type: 'code', override_default_response_type: true, auth_type: 'rerequest', extras: { setup: {}, sessionInfoVersion: '3', version: 'v4' } });
        } catch { active = false; window.clearTimeout(timer); fail('Facebook could not open. Allow popups for this website and try again.'); }
      };
      expiry = window.setTimeout(() => { if (!active && !codeSubmitted && !disposed) { launch.current = null; setReady(false); fail('Connection session expired. Click Start again.'); } }, 14 * 60 * 1000);
      if (disposed) window.clearTimeout(expiry);
    }).catch(error => fail((error as Error).message));
    return () => { disposed = true; active = false; window.clearTimeout(timer); window.clearTimeout(expiry); window.removeEventListener('message', listener); launch.current = null; finish.current = null; };
    // Keep the active popup stable while the workspace refreshes in the background.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, demo, generation]);

  if (demo) return <div><button type="button" className="primary" disabled>Connect WhatsApp with Facebook</button><p>Create a permanent account to connect your WhatsApp business.</p></div>;
  if (!enabled) return <div><button type="button" className="primary" disabled>Connect WhatsApp with Facebook</button><p className="info-strip">Facebook connection is awaiting platform setup. The platform owner must configure the Meta app, Embedded Signup configuration, HTTPS domain and webhooks.</p></div>;
  const working = phase === 'opening' || phase === 'finishing';
  return <div>
    <p>Connect your shop through Facebook. No API keys are needed. {connected && 'Connecting again will replace this workspace’s current WhatsApp connection after setup succeeds.'}</p>
    <div className="connection-actions">
    <button type="button" className="primary facebook-connect" disabled={!ready || working || phase === 'connected' || phase === 'error'} onClick={() => launch.current?.()}>{working ? 'Connecting…' : 'Connect WhatsApp with Facebook'}</button>
    {(phase === 'error' || phase === 'connected') && <button type="button" onClick={() => setGeneration(value => value + 1)}>Start again</button>}
    {retrySetup && <button type="button" onClick={() => finish.current?.()}>Retry connection setup</button>}
    </div>
    <p role="status" aria-live="polite">{feedback}</p>
    <p className="muted">You may need to verify your phone and add a payment method in Meta. Standard Cloud API onboarding is supported; existing WhatsApp Business mobile-app coexistence requires a separate Meta setup.</p>
  </div>;
}
