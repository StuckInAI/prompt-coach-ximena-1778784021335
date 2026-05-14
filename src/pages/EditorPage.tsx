import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MessageSquare, Save, Trash2, Plus, Sparkles } from 'lucide-react';
import styles from './EditorPage.module.css';
import PromptEditor from '@/components/editor/PromptEditor';
import IssuesPanel from '@/components/editor/IssuesPanel';
import ChatSidebar from '@/components/chat/ChatSidebar';
import TagSelector from '@/components/tags/TagSelector';
import { usePromptStore } from '@/hooks/usePromptStore';
import { analyzePrompt, applyIssueFix } from '@/lib/feedbackEngine';
import type { FeedbackIssue } from '@/types';

export default function EditorPage() {
  const store = usePromptStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [currentId, setCurrentId] = useState<string | null>(id ?? null);
  const [title, setTitle] = useState<string>('Untitled prompt');
  const [content, setContent] = useState<string>('');
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const initialized = useRef<boolean>(false);

  // Initialize: load existing or create new
  useEffect(() => {
    if (initialized.current) return;
    if (id) {
      const p = store.getPrompt(id);
      if (p) {
        setCurrentId(p.id);
        setTitle(p.title);
        setContent(p.content);
        initialized.current = true;
        return;
      }
    }
    // create a new draft
    const p = store.createPrompt();
    setCurrentId(p.id);
    setTitle(p.title);
    setContent(p.content);
    initialized.current = true;
    navigate(`/dashboard/editor/${p.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist title/content changes (debounced via effect)
  useEffect(() => {
    if (!currentId || !initialized.current) return;
    const handle = setTimeout(() => {
      store.updatePrompt(currentId, { title, content });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, currentId]);

  const issues = useMemo<FeedbackIssue[]>(() => analyzePrompt(content), [content]);

  const handleApplyFix = (issue: FeedbackIssue) => {
    const next = applyIssueFix(content, issue);
    setContent(next);
    toast.success('Fix applied');
  };

  const handleClearIssues = () => {
    // Clearing is conceptual — issues regenerate from content. We can nudge user.
    toast.message('Issues regenerate from your prompt content.');
  };

  const handleNew = () => {
    const p = store.createPrompt();
    setCurrentId(p.id);
    setTitle(p.title);
    setContent(p.content);
    navigate(`/dashboard/editor/${p.id}`);
  };

  const handleDelete = () => {
    if (!currentId) return;
    if (!window.confirm('Delete this prompt?')) return;
    store.deletePrompt(currentId);
    toast.success('Prompt deleted');
    navigate('/dashboard/library');
  };

  const handleSave = () => {
    if (!currentId) return;
    store.updatePrompt(currentId, { title, content });
    toast.success('Saved');
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <input
              className={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Prompt title"
            />
            <div className={styles.meta}>
              <span><Sparkles size={11} /> {issues.length} issue{issues.length === 1 ? '' : 's'}</span>
              <span>{wordCount} word{wordCount === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={handleNew} title="New prompt">
              <Plus size={14} /> <span>New</span>
            </button>
            <button className={styles.iconBtn} onClick={handleSave} title="Save">
              <Save size={14} /> <span>Save</span>
            </button>
            <button className={styles.iconBtn} onClick={handleDelete} title="Delete">
              <Trash2 size={14} />
            </button>
            <button
              className={chatOpen ? styles.iconBtnActive : styles.iconBtn}
              onClick={() => setChatOpen((o) => !o)}
              title="Toggle chat"
            >
              <MessageSquare size={14} /> <span>Chat</span>
            </button>
          </div>
        </header>

        <div className={styles.tagsRow}>
          {currentId && (
            <TagSelector
              promptId={currentId}
              tagIds={currentId ? (store.getPrompt(currentId)?.tagIds ?? []) : []}
            />
          )}
        </div>

        <div className={styles.body}>
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
            onClear={handleClearIssues}
            onApplyFix={handleApplyFix}
          />
        </div>
      </div>

      {chatOpen && currentId && (
        <ChatSidebar
          promptId={currentId}
          promptContext={content}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
