import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';

type OnboardingContextValue = {
  open: boolean;
  step: number;
  setStep: (n: number) => void;
  close: () => void;
  reopen: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    const done = loadJSON<boolean>('onboarding_done', false);
    if (!done) setOpen(true);
  }, []);

  const close = () => {
    saveJSON('onboarding_done', true);
    setOpen(false);
  };
  const reopen = () => {
    setStep(0);
    setOpen(true);
  };

  return (
    <OnboardingContext.Provider value={{ open, step, setStep, close, reopen }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
