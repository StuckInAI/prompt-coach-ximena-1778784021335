import { useState } from 'react';
import { usePromptStore } from '@/hooks/usePromptStore';
import { toast } from 'sonner';
import { User, Bell, Trash2, Save } from 'lucide-react';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { preferences, setPreferences, prompts, folders, tags } = usePromptStore();
  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [useCase, setUseCase] = useState(preferences.useCase);
  const [sensitivity, setSensitivity] = useState(preferences.feedbackSensitivity);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    setPreferences({ displayName, useCase, feedbackSensitivity: sensitivity });
    toast.success('Preferences saved!');
  };

  const handleClearAll = () => {
    localStorage.removeItem('promptcoach-store');
    localStorage.removeItem('promptcoach-onboarding');
    window.location.reload();
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Settings</h1>

        {/* Profile */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <User size={16} />
            <span>Profile</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Display name</label>
            <input
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </section>

        {/* Preferences */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Bell size={16} />
            <span>Preferences</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Default use case</label>
            <div className={styles.radioGroup}>
              {(['chatgpt', 'system-prompt', 'both'] as const).map((uc) => (
                <label key={uc} className={styles.radioLabel}>
                  <input type="radio" name="useCase" value={uc} checked={useCase === uc} onChange={() => setUseCase(uc)} />
                  {uc === 'chatgpt' ? 'ChatGPT prompts' : uc === 'system-prompt' ? 'System prompts' : 'Both'}
                </label>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Feedback sensitivity</label>
            <div className={styles.radioGroup}>
              {(['standard', 'strict'] as const).map((s) => (
                <label key={s} className={styles.radioLabel}>
                  <input type="radio" name="sensitivity" value={s} checked={sensitivity === s} onChange={() => setSensitivity(s)} />
                  {s === 'standard' ? 'Standard — catch obvious issues' : 'Strict — catch everything'}
                </label>
              ))}
            </div>
          </div>
          <button className={styles.saveBtn} onClick={handleSave}>
            <Save size={14} /> Save preferences
          </button>
        </section>

        {/* Stats */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Your data</span>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}><span className={styles.statNum}>{prompts.length}</span><span className={styles.statLabel}>Prompts</span></div>
            <div className={styles.stat}><span className={styles.statNum}>{folders.length}</span><span className={styles.statLabel}>Folders</span></div>
            <div className={styles.stat}><span className={styles.statNum}>{tags.length}</span><span className={styles.statLabel}>Tags</span></div>
          </div>
          <p className={styles.note}>All data is stored locally in your browser via localStorage. Nothing is sent to any server.</p>
        </section>

        {/* Danger zone */}
        <section className={`${styles.section} ${styles.dangerSection}`}>
          <div className={styles.sectionHeader}>
            <Trash2 size={16} />
            <span>Danger zone</span>
          </div>
          {!confirmDelete ? (
            <button className={styles.dangerBtn} onClick={() => setConfirmDelete(true)}>
              Clear all data
            </button>
          ) : (
            <div className={styles.confirmBox}>
              <p>This will permanently delete all your prompts, folders, and settings. Are you sure?</p>
              <div className={styles.confirmBtns}>
                <button className={styles.dangerBtn} onClick={handleClearAll}>Yes, delete everything</button>
                <button className={styles.cancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
