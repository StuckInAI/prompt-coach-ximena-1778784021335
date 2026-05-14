import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface OnboardingCtx {
  open: boolean;
  completed: boolean;
  reopen: () => void;
  complete: () => void;
}

const Ctx = createContext<OnboardingCtx | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const done = localStorage.getItem('promptcoach-onboarding') === 'done';
    setCompleted(done);
    if (!done) setOpen(true);
  }, []);

  const complete = () => {
    localStorage.setItem('promptcoach-onboarding', 'done');
    setCompleted(true);
    setOpen(false);
  };

  const reopen = () => setOpen(true);

  return (
    <Ctx.Provider value={{ open, completed, reopen, complete }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
