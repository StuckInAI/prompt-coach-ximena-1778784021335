import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Lightbulb, Sparkles, Trash2, Wand2 } from 'lucide-react';
import styles from './IssuesPanel.module.css';
import type { FeedbackIssue, IssueType } from '@/types';

type IssuesPanelProps = {
  issues: FeedbackIssue[];
  activeIssueId: string | null;
  onSelectIssue: (id: string | null) => void;
  onClear: () => void;
  onApplyFix: (issue: FeedbackIssue) => void;
  onImproveAll: () => void;
};

export default function IssuesPanel({ issues, activeIssueId, onSelectIssue, onClear, onApplyFix, onImproveAll }: IssuesPanelProps) {
  const [open, setOpen] = useState<boolean>(true);

  const counts = issues.reduce<Record<IssueType, number>>(
    (acc, i) => { acc[i.type] = (acc[i.type] ?? 0) + 1; return acc; },
    { vague: 0, missing: 0, improvement: 0 }
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button className={styles.toggle} onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          <span>Feedback</span>
          <span className={styles.countBadge}>{issues.length}</span>
        </button>
        <div className={styles.headerStats}>
          <Stat type="missing" count={counts.missing} />
          <Stat type="vague" count={counts.vague} />
          <Stat type="improvement" count={counts.improvement} />
        </div>
        <div className={styles.headerActions}>
          {issues.length > 0 && (
            <button className={styles.improveAllBtn} onClick={onImproveAll} title="Generate improved prompt">
              <Wand2 size={13} />
              <span>Improve prompt</span>
            </button>
          )}
          {issues.length > 0 && (
            <button className={styles.clearBtn} onClick={onClear} title="Clear feedback">
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className={styles.list}>
          {issues.length === 0 ? (
            <div className={styles.empty}>
              <Sparkles size={20} />
              <div className={styles.emptyTitle}>No issues found</div>
              <div className={styles.emptyBody}>Your prompt looks solid. Try adding more context or a specific output format to push it further.</div>
            </div>
          ) : (
            issues.map((issue) => (
              <button
                key={issue.id}
                className={clsx(styles.card, activeIssueId === issue.id && styles.cardActive)}
                onMouseEnter={() => onSelectIssue(issue.id)}
                onMouseLeave={() => onSelectIssue(null)}
                onClick={() => onApplyFix(issue)}
              >
                <div className={styles.cardIcon} data-type={issue.type}>
                  {iconFor(issue.type)}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardLabel}>{issue.shortLabel}</span>
                    <span className={styles.cardType} data-type={issue.type}>{labelFor(issue.type)}</span>
                  </div>
                  <div className={styles.cardExpl}>{issue.explanation}</div>
                  <div className={styles.cardFix}>
                    <Wand2 size={11} />
                    <span>{issue.suggestion}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ type, count }: { type: IssueType; count: number }) {
  if (count === 0) return null;
  return (
    <span className={styles.stat} data-type={type}>
      {iconFor(type)}
      <span>{count}</span>
    </span>
  );
}

function iconFor(t: IssueType) {
  if (t === 'missing') return <AlertCircle size={13} />;
  if (t === 'vague') return <AlertTriangle size={13} />;
  return <Lightbulb size={13} />;
}

function labelFor(t: IssueType): string {
  if (t === 'vague') return 'Vague';
  if (t === 'missing') return 'Missing';
  return 'Improve';
}
