import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Save, MessageSquare, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import styles from './EditorPage.module.css';
import PromptEditor from '@/components/editor/PromptEditor';
import IssuesPanel from '@/components/editor/IssuesPanel';
import ChatSidebar from '@/components/chat/ChatSidebar';
import TagSelector from '@/components/tags/TagSelector';
import { usePromptStore } from '@/hooks/usePromptStore';
import { analyzePrompt } from '@/lib/feedbackEngine';
import type { FeedbackIssue } from '@/types';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const store = usePromptStore();

  const queryId = searchParams.get('id') ?? undefined;
  const promptId = id ?? queryId;

  const existing = useMemo(() => (promptId ? store.getPrompt(promptId) : undefined), [promptId, store]);

  const [currentId, setCurrentId] = useState<string | null>(existing?.id ?? null);
  const [title, setTitle] = useState<string>(existing?.title ?? 'Untitled prompt');
  const [content, setContent] = useState<string>(existing?.content ?? '');
  const [issues, setIssues] = useState<FeedbackIssue[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [chatOpen, setChatOpen] = useState<boolean>(false);

  // Sync from existing prompt id
  useEffect(() => {
    if (existing && existing.id !== currentId) {
      setCurrentId(existing.id);
      setTitle(existing.title);
      setContent(existing.content);
    }
  }, [existing, currentId]);

  // Debounced feedback analysis (500ms)
  useEffect(() => {
    if (!content.trim()) {
      setIssues([]);
      return;
    }
    setAnalyzing(true);
    const t = setTimeout(() => {
      const result = analyzePrompt(content, store.preferences.useCase, store.preferences.sensitivity);
      setIssues(result);
      setAnalyzing(false);
    }, 500);
    return () => clearTimeout(t);
  }, [content, store.preferences.useCase, store.preferences.sensitivity]);

  // Auto-save (2s debounce)
  const firstRun = useRef<boolean>(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveStatus('saving');
    const t = setTimeout(() => {
      if (!currentId) {
        if (content.trim() || title.trim() !== 'Untitled prompt') {
          const p = store.createPrompt({ title, content });
          setCurrentId(p.id);
          navigate(`/dashboard/editor/${p.id}`, { replace: true });
        }
      } else {
        store.updatePrompt(currentId, { title, content });
      }
      setSaveStatus('saved');
      const t2 = setTimeout(() => setSaveStatus('idle'), 1200);
      return () => clearTimeout(t2);
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  const handleManualSave = () => {
    if (!currentId) {
      const p = store.createPrompt({ title, content });
      setCurrentId(p.id);
      navigate(`/dashboard/editor/${p.id}`, { replace: true });
    } else {
      store.updatePrompt(currentId, { title, content });
    }
    setSaveStatus('saved');
    toast.success('Prompt saved');
    setTimeout(() => setSaveStatus('idle'), 1200);
  };

  const handleDelete = () => {
    if (!currentId) return;
    if (!confirm('Delete this prompt? This cannot be undone.')) return;
    store.deletePrompt(currentId);
    toast.success('Prompt deleted');
    navigate('/dashboard/library');
  };

  const handleClearFeedback = () => setIssues([]);

  const handleApplyFix = (issue: FeedbackIssue) => {
    // Insert suggestion text inline near the issue range
    const before = content.slice(0, issue.endIndex);
    const after = content.slice(issue.endIndex);
    const insertion = ` [${issue.suggestion}]`;
    setContent(before + insertion + after);
    toast.success('Suggestion inserted');
  };

  const currentPromptForChat = currentId ?? 'draft';

  return (
    <div className={styles.wrap}>
      <div className={styles.editorCol}>
        <div className={styles.toolbar}>
          <input
            className={styles.titleInput}
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="Prompt title"
          />
          <div className={styles.toolbarRight}>
            <span className={styles.saveStatus} data-status={saveStatus}>
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'idle' && (analyzing ? 'Analyzing…' : '\u00A0')}
            </span>
            <TagSelector
              selectedTagIds={currentId ? (store.getPrompt(currentId)?.tagIds ?? []) : []}
              onToggle={(tagId: string) => {
                if (!currentId) {
                  const p = store.createPrompt({ title, content });
                  setCurrentId(p.id);
                  navigate(`/dashboard/editor/${p.id}`, { replace: true });
                  store.togglePromptTag(p.id, tagId);
                } else {
                  store.togglePromptTag(currentId, tagId);
                }
              }}
            />
            <button className={styles.btnGhost} onClick={() => setChatOpen((v) => !v)}>
              {chatOpen ? <X size={14} /> : <MessageSquare size={14} />}
              <span>{chatOpen ? 'Close chat' : 'Coach chat'}</span>
            </button>
            <button className={styles.btnPrimary} onClick={handleManualSave}>
              <Save size={14} />
              <span>Save</span>
            </button>
            {currentId && (
              <button className={styles.btnDanger} onClick={handleDelete} title="Delete prompt">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className={styles.editorScroll}>
          <PromptEditor
            value={content}
            onChange={setContent}
            issues={issues}
            activeIssueId={activeIssueId}
            onHoverIssue={setActiveIssueId}
            onApplyFix={handleApplyFix}
          />
          <IssuesPanel
            issues={issues}
            activeIssueId={activeIssueId}
            onSelectIssue={setActiveIssueId}
            onClear={handleClearFeedback}
            onApplyFix={handleApplyFix}
          />
        </div>
      </div>

      {chatOpen && (
        <ChatSidebar
          promptId={currentPromptForChat}
          promptContext={content}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
