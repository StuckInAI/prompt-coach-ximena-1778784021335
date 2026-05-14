import { useEffect, useState } from 'react';
import { Copy, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import styles from './FeedbackTooltip.module.css';
import type { FeedbackIssue } from '@/types';

type FeedbackTooltipProps = {
  issue: FeedbackIssue;
  x: number;
  y: number;
  onApplyFix: (issue: FeedbackIssue) => void;
};

export default function FeedbackTooltip({ issue, x, y, onApplyFix }: FeedbackTooltipProps) {
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y });

  useEffect(() => {
    const w = 320;
    const left = Math.min(Math.max(8, x - w / 2), window.innerWidth - w - 8);
    const top = Math.max(8, y - 12);
    setPos({ left, top });
  }, [x, y]);

  const copyFix = () => {
    navigator.clipboard.writeText(issue.suggestion).then(
      () => toast.success('Suggestion copied'),
      () => toast.error('Could not copy')
    );
  };

  return (
    <div
      className={styles.tooltip}
      style={{ left: pos.left, top: pos.top, transform: 'translateY(-100%)' }}
      data-type={issue.type}
    >
      <div className={styles.header}>
        <span className={styles.badge} data-type={issue.type}>{labelFor(issue.type)}</span>
        <span className={styles.label}>{issue.shortLabel}</span>
      </div>
      <div className={styles.body}>{issue.explanation}</div>
      <div className={styles.suggestion}>
        <div className={styles.suggestionTitle}>Suggested fix</div>
        <div className={styles.suggestionText}>{issue.suggestion}</div>
      </div>
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={copyFix}>
          <Copy size={12} /> Copy fix
        </button>
        <button className={styles.actionPrimary} onClick={() => onApplyFix(issue)}>
          <Wand2 size={12} /> Insert fix
        </button>
      </div>
    </div>
  );
}

function labelFor(t: FeedbackIssue['type']): string {
  if (t === 'vague') return 'Vague';
  if (t === 'missing') return 'Missing';
  return 'Improve';
}
