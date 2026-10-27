"use client";
import { useTheme } from "@/lib/theme";
import type { ReactNode } from 'react';
import { Check, CheckCheck, MessageCircle, Moon, Sparkles, Sun } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
    const [dark, setDark] = useTheme();

    return <div className="auth-page">
        <section className="auth-story">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div className="brand"><div className="brand-icon"><MessageCircle /></div>wa<span>flow</span>.</div>
                <button type="button" className="icon-button" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{ minWidth: 44, minHeight: 44 }}>{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
            </div>
            <div className="auth-copy">
                <span className="badge">A little more human. A lot more connected.</span>
                <h1>Good conversations.<br />Lovely possibilities.</h1>
                <p>A calmer way to manage your WhatsApp business.<br />Bring your customers, conversations, and daily<br />workflows into one thoughtful workspace.</p>
                <div className="auth-illustration">
                    <div className="floating-message"><span className="avatar peach">PS</span><div><strong>Priya Sharma</strong><p>Hi! I’d love to see your new collection ✨</p></div><small>Just now</small></div>
                    <div className="floating-reply"><span className="bot-icon"><Sparkles size={22} /></span><div><strong>A little help from your workflow</strong><p>A warm welcome, right on time.</p></div><CheckCheck size={20} /></div>
                </div>
                <div className="auth-benefits"><span><Check size={16} />One shared inbox</span><span><Check size={16} />Happier customers</span><span><Check size={16} />Less busywork</span></div>
            </div>
            <small>BUILT FOR SMALL BUSINESSES WITH BIG HEARTS</small>
        </section>
        <section className="auth-form"><div>{children}</div></section>
    </div>;
}


