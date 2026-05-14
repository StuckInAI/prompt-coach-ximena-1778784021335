import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, Save, Trash2, Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import styles from './EditorPage.module.css';
import PromptEditor from '@/components/editor/PromptEditor';
import IssuesPanel from '@/components/editor/IssuesPanel';
import ChatSidebar from '@/components/chat/ChatSidebar';
import TagSelector from '@/components/tags/TagSelector';
import { usePromptStore } from '@/hooks/usePromptStore';
import { analyzePrompt } from '@/lib/feedbackEngine';
import type { FeedbackIssue, Sensitivity } from '@/types';

function mapSensitivity(s: Sensitivity): 'standard' | 'strict' | 'gentle' {
  if (s === 'strict') return 'strict';
  if (s === 'lenient' || s === 'gentle') return 'gentle';
  return 'standard';
}

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = usePromptStore();
  const { preferences } = store;

  const existing = id ? store.getPrompt(id) : undefined;
  const [promptId, setPromptId] = useState<string | null>(existing?.id ?? null);
  const [title, setTitle] = useState<string>(existing?.title ?? 'Untitled prompt');
  const [content, setContent] = useState<string>(existing?.content ?? '');
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);

  const didInit = useRef<boolean>(false);

  // Create a draft prompt on first load if none exists
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (!existing && !promptId) {
      const p = store.createPrompt({ title, content });
      setPromptId(p.id);
      navigate(`/dashboard/editor/${p.id}`, { replace: true });
    }
  }, [existing, promptId, store, title, content, navigate]);

  // Persist edits
  useEffect(() => {
    if (!promptId) return;
    const t = setTimeout(() => {
      store.updatePrompt(promptId, { title, content });
    }, 250);
    return () => clearTimeout(t);
  }, [promptId, title, content, store]);

  const issues: FeedbackIssue[] = useMemo(
    () => analyzePrompt(content, preferences.useCase, mapSensitivity(preferences.sensitivity)),
    [content, preferences.useCase, preferences.sensitivity]
  );

  const currentPrompt = promptId ? store.getPrompt(promptId) : undefined;
  const tagIds = currentPrompt?.tagIds ?? [];

  const applyFix = (issue: FeedbackIssue) => {
    const anyIssue = issue as FeedbackIssue & { replacement?: string | null; appendText?: string };

    if (anyIssue.replacement != null) {
      const start = Math.max(0, Math.min(issue.startIndex, content.length));
      const end = Math.max(start, Math.min(issue.endIndex, content.length));
      const next = content.slice(0, start) + anyIssue.replacement + content.slice(end);
      setContent(next);
      toast.success('Fix applied');
      return;
    }
    if (anyIssue.appendText) {
      const sep = content.length > 0 && !content.endsWith('\n') ? '\n\n' : '';
      setContent(content + sep + anyIssue.appendText);
      toast.success('Suggestion appended');
      return;
    }
    // Fallback: append the suggestion text
    const sep = content.length > 0 && !content.endsWith('\n') ? '\n\n' : '';
    setContent(content + sep + issue.suggestion);
    toast.success('Suggestion appended');
  };

  const copyAll = () => {
    navigator.clipboard.writeText(content).then(
      () => toast.success('Prompt copied'),
      () => toast.error('Could not copy')
    );
  };

  const clearAll = () => {
    setContent('');
    toast.message('Cleared');
  };

  const deletePrompt = () => {
    if (!promptId) return;
    if (!confirm('Delete this prompt?')) return;
    store.deletePrompt(promptId);
    navigate('/dashboard/library');
  };

  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        <div className={styles.center}>
          <header className={styles.headerRow}>
            <input
              className={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled prompt"
            />
            <div className={styles.headerActions}>
              <button className={styles.iconBtn} onClick={copyAll} title="Copy">
                <Copy size={14} />
              </button>
              <button className={styles.iconBtn} onClick={clearAll} title="Clear">
                <Trash2 size={14} />
              </button>
              {promptId && (
                <button className={styles.iconBtn} onClick={deletePrompt} title="Delete prompt">
                  <Trash2 size={14} />
                </button>
              )}
              <button
                className={styles.chatBtn}
                onClick={() => setChatOpen((c) => !c)}
                title="Toggle chat"
              >
                <MessageSquare size={14} />
                <span>{chatOpen ? 'Hide chat' : 'Open chat'}</span>
              </button>
            </div>
          </header>

          {promptId && (
            <div className={styles.tagsRow}>
              <TagSelector promptId={promptId} tagIds={tagIds} />
            </div>
          )}

          <PromptEditor
            value={content}
            onChange={setContent}
            issues={issues}
            activeIssueId={activeIssueId}
            onHoverIssue={setActiveIssueId}
            onApplyFix={applyFix}
          />

          <div className={styles.issuesWrap}>
            <IssuesPanel
              issues={issues}
              activeIssueId={activeIssueId}
              onSelectIssue={setActiveIssueId}
              onClear={clearAll}
              onApplyFix={applyFix}
            />
          </div>

          <div className={styles.footHint}>
            <Sparkles size={12} />
            <span>Tip: hover any highlight to see the explanation and a one-click fix.</span>
            <Save size={12} style={{ marginLeft: 'auto' }} />
            <span>Saved locally</span>
          </div>
        </div>

        {chatOpen && promptId && (
          <ChatSidebar
            promptId={promptId}
            promptContext={content}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
