import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './PromptEditor.module.css';
import type { FeedbackIssue } from '@/types';
import FeedbackTooltip from './FeedbackTooltip';

type PromptEditorProps = {
  value: string;
  onChange: (val: string) => void;
  issues: FeedbackIssue[];
  activeIssueId: string | null;
  onHoverIssue: (id: string | null) => void;
  onApplyFix: (issue: FeedbackIssue) => void;
};

export default function PromptEditor({ value, onChange, issues, activeIssueId, onHoverIssue, onApplyFix }: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [hoveredIssue, setHoveredIssue] = useState<FeedbackIssue | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Auto-resize textarea
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.max(280, ta.scrollHeight) + 'px';
  }, [value]);

  // Sync overlay scroll with textarea
  useEffect(() => {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    if (!ta || !ov) return;
    const onScroll = () => {
      ov.scrollTop = ta.scrollTop;
      ov.scrollLeft = ta.scrollLeft;
    };
    ta.addEventListener('scroll', onScroll);
    return () => ta.removeEventListener('scroll', onScroll);
  }, []);

  const segments = buildSegments(value, issues);

  const handleSpanEnter = (e: React.MouseEvent<HTMLSpanElement>, issue: FeedbackIssue) => {
    const rect = (e.currentTarget as HTMLSpanElement).getBoundingClientRect();
    setHoveredIssue(issue);
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    onHoverIssue(issue.id);
  };
  const handleSpanLeave = () => {
    setHoveredIssue(null);
    setTooltipPos(null);
    onHoverIssue(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.editorBox}>
        <div ref={overlayRef} className={styles.overlay} aria-hidden="true">
          {segments.map((seg, i) => {
            if (seg.issue) {
              const isActive = activeIssueId === seg.issue.id;
              return (
                <span
                  key={i}
                  className={clsx('feedback-mark', seg.issue.type, isActive && 'active')}
                  onMouseEnter={(e) => handleSpanEnter(e, seg.issue!)}
                  onMouseLeave={handleSpanLeave}
                >
                  {seg.text}
                </span>
              );
            }
            return <span key={i}>{seg.text}</span>;
          })}
          {/* trailing space to preserve final line wrap */}
          <span>{'\u200b'}</span>
        </div>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          placeholder="Start typing your prompt here. The coach will highlight what's vague, what's missing, and how to fix it…"
          spellCheck={false}
        />
      </div>
      {hoveredIssue && tooltipPos && (
        <FeedbackTooltip
          issue={hoveredIssue}
          x={tooltipPos.x}
          y={tooltipPos.y}
          onApplyFix={onApplyFix}
        />
      )}
    </div>
  );
}

type Segment = { text: string; issue: FeedbackIssue | null };

function buildSegments(text: string, issues: FeedbackIssue[]): Segment[] {
  if (!issues.length) return [{ text, issue: null }];
  // Resolve overlaps: pick the issue with smallest range when overlapping
  const sorted = [...issues].sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
  const segs: Segment[] = [];
  let cursor = 0;
  for (const iss of sorted) {
    if (iss.startIndex < cursor) continue; // skip overlap
    if (iss.startIndex > cursor) {
      segs.push({ text: text.slice(cursor, iss.startIndex), issue: null });
    }
    const end = Math.min(iss.endIndex, text.length);
    segs.push({ text: text.slice(iss.startIndex, end), issue: iss });
    cursor = end;
  }
  if (cursor < text.length) segs.push({ text: text.slice(cursor), issue: null });
  return segs;
}
