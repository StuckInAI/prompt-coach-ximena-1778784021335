import { toast } from 'sonner';
import { Trash2, RotateCcw } from 'lucide-react';
import { usePromptStore } from '@/hooks/usePromptStore';
import { useOnboarding } from '@/hooks/useOnboarding';
import type { Sensitivity, UseCase } from '@/types';

export default function SettingsPage() {
  const store = usePromptStore();
  const { reopen } = useOnboarding();

  const handleReset = () => {
    if (!confirm('Delete all prompts, tags, folders, and preferences? This cannot be undone.')) return;
    store.resetAll();
    toast.success('All data cleared');
  };

  return (
    <div style={{ padding: '24px 32px', height: '100%', overflow: 'auto', maxWidth: 720 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '4px 0 0' }}>
          Personalize how PromptCoach analyzes your prompts.
        </p>
      </header>

      <Section title="Profile">
        <Field label="Display name">
          <input
            value={store.preferences.displayName}
            onChange={(e) => store.updatePreferences({ displayName: e.target.value })}
            style={inputStyle}
            placeholder="Your name"
          />
        </Field>
      </Section>

      <Section title="Coaching preferences">
        <Field label="Primary use case" hint="What kind of prompts do you mostly write?">
          <select
            value={store.preferences.useCase}
            onChange={(e) => store.updatePreferences({ useCase: e.target.value as UseCase })}
            style={inputStyle}
          >
            <option value="chat">Chat prompts</option>
            <option value="system-prompt">System prompts</option>
            <option value="both">Both</option>
          </select>
        </Field>
        <Field label="Feedback sensitivity" hint="How aggressive should the coach be?">
          <select
            value={store.preferences.sensitivity}
            onChange={(e) => store.updatePreferences({ sensitivity: e.target.value as Sensitivity })}
            style={inputStyle}
          >
            <option value="lenient">Lenient — only major issues</option>
            <option value="standard">Standard — balanced</option>
            <option value="strict">Strict — flag everything</option>
          </select>
        </Field>
      </Section>

      <Section title="Onboarding">
        <button onClick={reopen} style={buttonStyle}>
          <RotateCcw size={13} /> Replay onboarding
        </button>
      </Section>

      <Section title="Danger zone">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0 }}>
          All data is stored locally in your browser. Clearing it removes everything permanently.
        </p>
        <button onClick={handleReset} style={{ ...buttonStyle, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <Trash2 size={13} /> Clear all data
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 18, marginBottom: 16,
    }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px' }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 4 }}>{label}</label>
      {hint && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{hint}</div>}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
  color: 'var(--text)',
  fontSize: 13.5,
  fontFamily: 'inherit',
  outline: 'none',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 14px',
  color: 'var(--text)',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
