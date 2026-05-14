import { Sparkles, FileText, MessageSquare, Wand2, ArrowRight, X } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useNavigate } from 'react-router-dom';

type Step = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    icon: <Sparkles size={22} />,
    title: 'Welcome to PromptCoach',
    body: 'Write better prompts with real-time, inline feedback. The coach highlights what is vague, what is missing, and how to fix it.',
  },
  {
    icon: <FileText size={22} />,
    title: 'Type in the editor',
    body: 'As you type, the coach analyzes your prompt and underlines specific phrases. Hover a highlight to see the explanation and suggested fix.',
  },
  {
    icon: <Wand2 size={22} />,
    title: 'Apply fixes with one click',
    body: 'Each issue ships with a concrete fix. Click "Insert fix" to apply it directly to your prompt.',
  },
  {
    icon: <MessageSquare size={22} />,
    title: 'Chat with the coach',
    body: 'Need deeper help? Open the chat sidebar and ask things like "give me an example" or "why does a role matter?".',
  },
];

export default function OnboardingModal() {
  const { open, step, setStep, close } = useOnboarding();
  const navigate = useNavigate();

  if (!open) return null;

  const current = STEPS[step] ?? STEPS[0];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      close();
      navigate('/dashboard/editor');
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'grid', placeItems: 'center',
        padding: 20,
      }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460,
          background: 'var(--bg-elev)',
          border: '1px solid var(--border-strong)',
          borderRadius: 14,
          padding: 28,
          boxShadow: 'var(--shadow)',
          position: 'relative',
        }}
      >
        <button
          onClick={close}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'transparent', border: 0,
            color: 'var(--text-dim)', cursor: 'pointer',
            padding: 6, borderRadius: 6,
          }}
          title="Skip"
        >
          <X size={16} />
        </button>

        <div
          style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--accent-soft)',
            color: '#c4b1ff',
            display: 'grid', placeItems: 'center',
            marginBottom: 16,
          }}
        >
          {current.icon}
        </div>

        <h2 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 8px' }}>{current.title}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
          {current.body}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === step ? 20 : 6, height: 6,
                  borderRadius: 999,
                  background: i === step ? 'var(--accent)' : 'var(--border-strong)',
                  transition: 'width 0.15s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isLast && (
              <button
                onClick={close}
                style={{
                  background: 'transparent', border: 0,
                  color: 'var(--text-muted)', cursor: 'pointer',
                  padding: '8px 12px', fontSize: 13, fontFamily: 'inherit',
                }}
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--accent)', color: 'white',
                border: 0, borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {isLast ? 'Get started' : 'Next'}
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
