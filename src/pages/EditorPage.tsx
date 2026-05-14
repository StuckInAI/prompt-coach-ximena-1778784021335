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
import type { FeedbackIssue, Prompt } from '@/types';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = usePromptStore();
  const { preferences } = store;

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [title, setTitle] = useState<string>('Untitled prompt');
  const [content, setContent] = useState<string>('');
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const initializedRef = useRef<boolean>(false);

  // Load or create the prompt for this route
  useEffect(() => {
    if (initializedRef.current && id && prompt && prompt.id === id) return;
    if (id) {
      const existing = store.getPrompt(id);
      if (existing) {
        setPrompt(existing);
        setTitle(existing.title);
        setContent(existing.content);
        initializedRef.current = true;
        return;
      }
      // Unknown id, create a new one and replace route
      const created = store.createPrompt();
      setPrompt(created);
      setTitle(created.title);
      setContent(created.content);
      initializedRef.current = true;
      navigate(`/dashboard/editor/${created.id}`, { replace: true });
      return;
    }
    // No id: create a fresh prompt
    const created = store.createPrompt();
    setPrompt(created);
    setTitle(created.title);
    setContent(created.content);
    initializedRef.current = true;
    navigate(`/dashboard/editor/${created.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const issues = useMemo<FeedbackIssue[]>(
    () => analyzePrompt(content, preferences.useCase, preferences.sensitivity),
    [content, preferences.useCase, preferences.sensitivity]
  );

  // Persist changes back to the store
  useEffect(() => {
    if (!prompt) return;
    const handle = setTimeout(() => {
      store.updatePrompt(prompt.id, { title, content });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, prompt?.id]);

  const applyFix = (issue: FeedbackIssue) => {
    if (issue.replacement != null) {
      const start = Math.max(0, Math.min(content.length, issue.startIndex));
      const end = Math.max(start, Math.min(content.length, issue.endIndex));
      const next = content.slice(0, start) + issue.replacement + content.slice(end);
      setContent(next);
      toast.success('Fix applied');
      return;
    }
    if (issue.appendText) {
      const sep = content.length === 0 || content.endsWith('\n') ? '' : '\n\n';
      setContent(content + sep + issue.appendText);
      toast.success('Fix appended');
      return;
    }
    // Fallback: copy suggestion
    navigator.clipboard.writeText(issue.suggestion).then(
      () => toast.success('Suggestion copied'),
      () => toast.error('Could not copy')
    );
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content).then(
      () => toast.success('Prompt copied'),
      () => toast.error('Could not copy')
    );
  };

  const handleSave = () => {
    if (!prompt) return;
    store.updatePrompt(prompt.id, { title, content });
    toast.success('Saved');
  };

  const handleDelete = () => {
    if (!prompt) return;
    store.deletePrompt(prompt.id);
    toast.success('Prompt deleted');
    navigate('/dashboard/library');
  };

  const handleClearIssues = () => {
    // Clearing is a UX hint; we just deselect.
    setActiveIssueId(null);
  };

  if (!prompt) return null;

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <input
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled prompt"
          />
          <div className={styles.toolbarActions}>
            <button className={styles.toolBtn} onClick={handleCopyAll} title="Copy prompt">
              <Copy size={14} />
              <span>Copy</span>
            </button>
            <button className={styles.toolBtn} onClick={handleSave} title="Save">
              <Save size={14} />
              <span>Save</span>
            </button>
            <button className={styles.toolBtn} onClick={() => setChatOpen((o) => !o)} title="Toggle chat">
              <MessageSquare size={14} />
              <span>{chatOpen ? 'Close chat' : 'Chat'}</span>
            </button>
            <button className={styles.toolBtnDanger} onClick={handleDelete} title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className={styles.tagsRow}>
          <Sparkles size={13} color="var(--text-dim)" />
          <TagSelector promptId={prompt.id} tagIds={prompt.tagIds} />
        </div>
        <div className={styles.editorWrap}>
          <PromptEditor
            value={content}
            onChange={setContent}
            issues={issues}
            activeIssueId={activeIssueId}
            onHoverIssue={setActiveIssueId}
            onApplyFix={applyFix}
          />
          <IssuesPanel
            issues={issues}
            activeIssueId={activeIssueId}
            onSelectIssue={setActiveIssueId}
            onClear={handleClearIssues}
            onApplyFix={applyFix}
          />
        </div>
      </div>
      {chatOpen && (
        <ChatSidebar
          promptId={prompt.id}
          promptContext={content}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
