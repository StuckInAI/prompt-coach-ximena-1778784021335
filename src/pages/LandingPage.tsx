import { Link } from 'react-router-dom';
import { Sparkles, Zap, MessageSquare, Library as LibraryIcon, ShieldCheck } from 'lucide-react';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}><Sparkles size={16} /></div>
          <span>PromptCoach</span>
        </div>
        <Link to="/dashboard/editor" className={styles.cta}>Open app</Link>
      </header>
      <main className={styles.hero}>
        <div className={styles.tag}>For non-technical founders</div>
        <h1 className={styles.title}>Write AI prompts that<br />actually work.</h1>
        <p className={styles.sub}>
          PromptCoach gives you Grammarly-style inline feedback as you type, plus a chat coach that
          explains what's vague, what's missing, and how to fix it.
        </p>
        <div className={styles.actions}>
          <Link to="/dashboard/editor" className={styles.primary}>Start coaching</Link>
          <Link to="/dashboard/library" className={styles.secondary}>Browse library</Link>
        </div>
        <div className={styles.features}>
          <Feature icon={<Zap size={18} />} title="Inline feedback" body="Highlighted spans tell you exactly what to fix, with hover tooltips." />
          <Feature icon={<MessageSquare size={18} />} title="Chat coach" body="Ask 'why does this matter?' and get a plain-English explanation." />
          <Feature icon={<LibraryIcon size={18} />} title="Prompt library" body="Organize prompts in folders, tag them, and reuse what works." />
          <Feature icon={<ShieldCheck size={18} />} title="Private by default" body="Your prompts live in your browser. Nothing is uploaded." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className={styles.feature}>
      <div className={styles.featureIcon}>{icon}</div>
      <div className={styles.featureTitle}>{title}</div>
      <div className={styles.featureBody}>{body}</div>
    </div>
  );
}
