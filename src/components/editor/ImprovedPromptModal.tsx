import { useEffect, useRef } from 'react';
import { X, Copy, Check, Wand2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import styles from './ImprovedPromptModal.module.css';
import type { FeedbackIssue } from '@/types';

type ImprovedPromptModalProps = {
  original: string;
  improved: string;
  issues: FeedbackIssue[];
  onAccept: (improved: string) => void;
  onClose: () => void;
};

export default function ImprovedPromptModal({
  original,
  improved,
  issues,
  onAccept,
  onClose,
}: ImprovedPromptModalProps) {
  const [copied, setCopied] = useState(false);
  const [editedImproved, setEditedImproved] = useState(improved);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedImproved).then(
      () => { setCopied(true); toast.success('Copied to clipboard'); setTimeout(() => setCopied(false), 2000); },
      () => toast.error('Could not copy')
    );
  };

  const handleAccept = () => {
    onAccept(editedImproved);
    onClose();
    toast.success('Improved prompt applied!');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  // Build a simple diff view: highlight lines that changed
  const originalLines = original.split('\n');
  const improvedLines = editedImproved.split('\n');

  return (
    <div className={styles.backdrop} ref={backdropRef} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}><Wand2 size={15} /></div>
            <div>
              <div className={styles.headerTitle}>Improved Prompt</div>
              <div className={styles.headerSub}>
                {issues.length} issue{issues.length !== 1 ? 's' : ''} addressed
              </div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Diff / comparison */}
        <div className={styles.body}>
          <div className={styles.columns}>
            {/* Original */}
            <div className={styles.col}>
              <div className={styles.colLabel}>
                <span className={styles.colLabelDot} data-side="before" />
                Original
              </div>
              <div className={styles.textBox} data-variant="original">
                {originalLines.map((line, i) => (
                  <div key={i} className={styles.line}>{line || '\u00A0'}</div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className={styles.arrow}><ArrowRight size={18} /></div>

            {/* Improved (editable) */}
            <div className={styles.col}>
              <div className={styles.colLabel}>
                <span className={styles.colLabelDot} data-side="after" />
                Improved <span className={styles.editHint}>(editable)</span>
              </div>
              <textarea
                className={styles.textareaImproved}
                value={editedImproved}
                onChange={(e) => setEditedImproved(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>

          {/* Changes summary */}
          {issues.length > 0 && (
            <div className={styles.changesSummary}>
              <div className={styles.changesTitle}>What was improved</div>
              <div className={styles.changesList}>
                {buildChangeSummary(issues).map((item, i) => (
                  <div key={i} className={styles.changeItem}>
                    <span className={styles.changeIcon} data-type={item.type}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Discard</button>
          <div className={styles.footerRight}>
            <button className={styles.copyBtn} onClick={handleCopy}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className={styles.acceptBtn} onClick={handleAccept}>
              <Check size={13} />
              Use this prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChangeSummaryItem {
  type: string;
  icon: string;
  label: string;
}

function buildChangeSummary(issues: FeedbackIssue[]): ChangeSummaryItem[] {
  const items: ChangeSummaryItem[] = [];
  const types = new Set(issues.map((i) => i.type));

  if (types.has('improvement')) {
    items.push({ type: 'improvement', icon: '💡', label: 'Added a role / expert persona to set context' });
  }
  if (types.has('vague')) {
    items.push({ type: 'vague', icon: '🔍', label: 'Replaced vague words with specific placeholders' });
  }
  if (types.has('missing')) {
    const missingIssues = issues.filter((i) => i.type === 'missing');
    const labels = [...new Set(missingIssues.map((i) => i.shortLabel))];
    labels.forEach((l) => {
      items.push({ type: 'missing', icon: '➕', label: `Added missing element: ${l}` });
    });
  }
  // Structural additions
  items.push({ type: 'structure', icon: '📋', label: 'Appended format, audience, tone, and length guidance' });

  return items;
}
