import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { usePromptStore } from '@/hooks/usePromptStore';
import { Sparkles, Zap, ArrowRight, X, CheckCircle } from 'lucide-react';
import styles from './OnboardingModal.module.css';

const STEPS = 3;

export default function OnboardingModal() {
  const { open, complete } = useOnboarding();
  const { setPreferences } = usePromptStore();
  const [step, setStep] = useState(0);
  const [useCase, setUseCase] = useState<'chatgpt' | 'system-prompt' | 'both'>('chatgpt');

  if (!open) return null;

  const handleFinish = () => {
    setPreferences({ useCase });
    complete();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={complete}><X size={16} /></button>
        <div className={styles.steps}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={`${styles.dot} ${i === step ? styles.dotActive : i < step ? styles.dotDone : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <div className={styles.body}>
            <div className={styles.icon}><Sparkles size={28} /></div>
            <h2 className={styles.heading}>Welcome to PromptCoach</h2>
            <p className={styles.desc}>What will you mainly use PromptCoach for?</p>
            <div className={styles.choices}>
              {(['chatgpt', 'system-prompt', 'both'] as const).map((uc) => (
                <button
                  key={uc}
                  className={`${styles.choice} ${useCase === uc ? styles.choiceActive : ''}`}
                  onClick={() => setUseCase(uc)}
                >
                  {uc === 'chatgpt' ? 'ChatGPT prompts' : uc === 'system-prompt' ? 'System prompts' : 'Both'}
                </button>
              ))}
            </div>
            <button className={styles.next} onClick={() => setStep(1)}>Next <ArrowRight size={14} /></button>
          </div>
        )}

        {step === 1 && (
          <div className={styles.body}>
            <div className={styles.icon}><Zap size={28} /></div>
            <h2 className={styles.heading}>Inline Feedback</h2>
            <p className={styles.desc}>As you type, PromptCoach underlines issues in your prompt:</p>
            <div className={styles.demoBox}>
              <p className={styles.demoText}>
                Write a <span className={styles.demoVague}>blog post</span> about{' '}
                <span className={styles.demoMissing}>stuff</span> for my{' '}
                <span className={styles.demoImprovement}>audience</span>.
              </p>
              <div className={styles.demoLegend}>
                <span className={styles.legendVague}>Vague</span>
                <span className={styles.legendMissing}>Missing info</span>
                <span className={styles.legendImprovement}>Improvable</span>
              </div>
            </div>
            <button className={styles.next} onClick={() => setStep(2)}>Next <ArrowRight size={14} /></button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.body}>
            <div className={styles.icon}><CheckCircle size={28} /></div>
            <h2 className={styles.heading}>Ready to go!</h2>
            <p className={styles.desc}>Here's a starter prompt to try in the editor:</p>
            <div className={styles.sampleBox}>
              Write a concise product description for a SaaS tool that helps remote teams manage projects. Target audience: busy startup founders. Tone: professional but approachable. Length: 2 sentences.
            </div>
            <button className={styles.next} onClick={handleFinish}>Start coaching <ArrowRight size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
