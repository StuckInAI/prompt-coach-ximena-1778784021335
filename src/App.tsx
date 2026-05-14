import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EditorPage from '@/pages/EditorPage';
import LibraryPage from '@/pages/LibraryPage';
import SettingsPage from '@/pages/SettingsPage';
import LandingPage from '@/pages/LandingPage';
import { PromptStoreProvider } from '@/hooks/usePromptStore';
import { OnboardingProvider } from '@/hooks/useOnboarding';
import OnboardingModal from '@/components/onboarding/OnboardingModal';

export default function App() {
  return (
    <PromptStoreProvider>
      <OnboardingProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard/editor" replace />} />
            <Route path="editor" element={<EditorPage />} />
            <Route path="editor/:id" element={<EditorPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <OnboardingModal />
        <Toaster position="bottom-right" richColors />
      </OnboardingProvider>
    </PromptStoreProvider>
  );
}
