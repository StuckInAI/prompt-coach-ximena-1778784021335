import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Save, Trash2, Sparkles, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import styles from './EditorPage.module.css';
import PromptEditor from '@/components/editor/PromptEditor';
import IssuesPanel from '@/components/editor/IssuesPanel';
import ChatSidebar from '@/components/chat/ChatSidebar';
import TagSelector from '@/components/tags/TagSelector';
import { usePromptStore } from '@/hooks/usePromptStore';
import { analyzePrompt } from '@/lib/feedbackEngine';
import type { FeedbackIssue, Preferences } from '@/types';

function normalizeSensitivity(s: Preferences['sensitivity']): 'strict' | 'standard' | 'gentle' {
  if (s === 'gentle') return 'gentle';
  if (s === 'strict') return 'strict';
  return 'standard';
}

export default function EditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const store = usePromptStore();

  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);

  // Resolve or create a prompt for this route
  useEffect(() => {
    if (id) {
      const existing = store.getPrompt(id);
      if (existing) {
        setActivePromptId(existing.id);
        setTitle(existing.title);
        setContent(existing.content);
        return;
      }
      // unknown id -> create new and redirect
    }
    const created = store.createPrompt();
    setActivePromptId(created.id);
    setTitle(created.title);
    setContent(created.content);
    navigate(`/dashboard/editor/${created.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Persist edits (title/content) with light debounce via effect
  useEffect(() => {
    if (!activePromptId) return;
    const t = setTimeout(() => {
      store.updatePrompt(activePromptId, { title: title || 'Untitled prompt', content });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePromptId, title, content]);

  const sensitivity = normalizeSensitivity(store.preferences.sensitivity);

  const issues: FeedbackIssue[] = useMemo(
    () => analyzePrompt(content, { sensitivity, useCase: store.preferences.useCase }),
    [content, sensitivity, store.preferences.useCase]
  );

  const handleApplyFix = (issue: FeedbackIssue) => {
    // Replace the highlighted range with the suggestion if it contains a concrete replacement,
    // otherwise append the suggestion to the end of the prompt.
    const before = content.slice(0, issue.startIndex);
    const after = content.slice(issue.endIndex);
    let next: string;
    if (issue.replacement && issue.replacement.length > 0) {
      next = before + issue.replacement + after;
    } else {
      const sep = content.endsWith('\n') || content.length === 0 ? '' : '\n\n';
      next = content + sep + issue.suggestion;
    }
    setContent(next);
    toast.success('Fix applied');
  };

  const handleClear = () => {
    setContent('');
    toast('Prompt cleared');
  };

  const handleDelete = () => {
    if (!activePromptId) return;
    store.deletePrompt(activePromptId);
    toast.success('Prompt deleted');
    navigate('/dashboard/library');
  };

  const handleSave = () => {
    if (!activePromptId) return;
    store.updatePrompt(activePromptId, { title: title || 'Untitled prompt', content });
    toast.success('Saved');
  };

  const prompt = activePromptId ? store.getPrompt(activePromptId) : undefined;

  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        <div className={styles.main}>
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={() => navigate('/dashboard/library')} title="Back to library">
              <ChevronLeft size={14} />
              <span>Library</span>
            </button>
            <input
              className={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled prompt"
            />
            <div className={styles.headerActions}>
              <button className={styles.iconBtn} onClick={handleSave} title="Save">
                <Save size={14} />
              </button>
              <button className={styles.iconBtn} onClick={handleClear} title="Clear">
                <Trash2 size={14} />
              </button>
              <button
                className={styles.chatBtn}
                onClick={() => setChatOpen((o) => !o)}
                title="Toggle chat coach"
              >
                <MessageSquare size={14} />
                <span>{chatOpen ? 'Hide chat' : 'Chat coach'}</span>
              </button>
            </div>
          </div>

          {prompt && (
            <div className={styles.tagRow}>
              <TagSelector promptId={prompt.id} tagIds={prompt.tagIds} />
            </div>
          )}

          <div className={styles.editorWrap}>
            <PromptEditor
              value={content}
              onChange={setContent}
              issues={issues}
              activeIssueId={activeIssueId}
              onHoverIssue={setActiveIssueId}
              onApplyFix={handleApplyFix}
            />
          </div>

          <div className={styles.issuesWrap}>
            <IssuesPanel
              issues={issues}
              activeIssueId={activeIssueId}
              onSelectIssue={setActiveIssueId}
              onClear={handleClear}
              onApplyFix={handleApplyFix}
            />
          </div>

          <div className={styles.footerRow}>
            <div className={styles.footerHint}>
              <Sparkles size={12} />
              <span>Tip: hover a highlight in the editor to see the suggested fix.</span>
            </div>
            <button className={styles.dangerBtn} onClick={handleDelete} title="Delete prompt">
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {chatOpen && activePromptId && (
          <ChatSidebar
            promptId={activePromptId}
            promptContext={content}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
