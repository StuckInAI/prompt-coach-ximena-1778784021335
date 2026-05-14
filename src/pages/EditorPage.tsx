import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, Plus, MessageSquare, X, Sparkles } from 'lucide-react';
import styles from './EditorPage.module.css';
import { analyzeFeedback, type FeedbackIssue } from '@/lib/feedbackEngine';
import { usePromptStore } from '@/hooks/usePromptStore';
import { debounce } from '@/lib/debounce';
import PromptEditor from '@/components/editor/PromptEditor';
import IssuesPanel from '@/components/editor/IssuesPanel';
import ChatSidebar from '@/components/chat/ChatSidebar';
import TagSelector from '@/components/tags/TagSelector';
import type { Prompt } from '@/types';

export default function EditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const store = usePromptStore();

  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('Untitled prompt');
  const [issues, setIssues] = useState<FeedbackIssue[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [promptId, setPromptId] = useState<string>(() => id ?? `prompt-${Date.now()}`);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Load existing prompt
  useEffect(() => {
    if (id) {
      const p = store.prompts.find((p) => p.id === id);
      if (p) {
        setContent(p.content);
        setTitle(p.title);
        setPromptId(p.id);
      } else {
        navigate('/dashboard/editor', { replace: true });
      }
    } else {
      // New prompt
      setContent('');
      setTitle('Untitled prompt');
      setPromptId(`prompt-${Date.now()}`);
      setIssues([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Debounced feedback analysis
  const analyzeRef = useRef(
    debounce((text: string) => {
      setIsAnalyzing(false);
      const result = analyzeFeedback(text);
      setIssues(result);
    }, 600)
  );

  useEffect(() => {
    if (!content.trim()) {
      setIssues([]);
      setIsAnalyzing(false);
      return;
    }
    setIsAnalyzing(true);
    analyzeRef.current(content);
  }, [content]);

  const handleContentChange = (val: string) => {
    setContent(val);
    setIsDirty(true);
  };

  const handleSave = useCallback(() => {
    const now = Date.now();
    const existing = store.prompts.find((p) => p.id === promptId);
    const prompt: Prompt = {
      id: promptId,
      title: title.trim() || 'Untitled prompt',
      content,
      folderId: existing?.folderId ?? null,
      tags: existing?.tags ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    store.upsertPrompt(prompt);
    setIsDirty(false);
    toast.success('Prompt saved');
    if (!id) {
      navigate(`/dashboard/editor/${promptId}`, { replace: true });
    }
  }, [content, id, navigate, promptId, store, title]);

  // Ctrl/Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handleApplyFix = (issue: FeedbackIssue) => {
    if (issue.startIndex >= 0 && issue.endIndex > issue.startIndex) {
      const before = content.slice(0, issue.startIndex);
      const after = content.slice(issue.endIndex);
      setContent(before + issue.suggestion + after);
      setIsDirty(true);
      toast.success('Fix applied');
    } else {
      toast.info('Suggestion: ' + issue.suggestion);
    }
  };

  const handleNewPrompt = () => {
    navigate('/dashboard/editor');
  };

  const currentPrompt = store.prompts.find((p) => p.id === promptId);

  return (
    <div className={styles.page}>
      <div className={styles.editorArea}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <input
              className={styles.titleInput}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
              placeholder="Prompt title"
            />
            {currentPrompt && (
              <TagSelector promptId={promptId} tagIds={currentPrompt.tags} />
            )}
          </div>
          <div className={styles.toolbarRight}>
            {isAnalyzing && (
              <span className={styles.analyzingBadge}>
                <Sparkles size={12} />
                Analyzing…
              </span>
            )}
            <button className={styles.iconBtn} onClick={handleNewPrompt} title="New prompt">
              <Plus size={16} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setChatOpen((o) => !o)}
              title="Toggle chat"
            >
              {chatOpen ? <X size={16} /> : <MessageSquare size={16} />}
            </button>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={!isDirty}
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>

        <div className={styles.editorScroll}>
          <PromptEditor
            value={content}
            onChange={handleContentChange}
            issues={issues}
            activeIssueId={activeIssueId}
            onHoverIssue={setActiveIssueId}
            onApplyFix={handleApplyFix}
          />
          <IssuesPanel
            issues={issues}
            activeIssueId={activeIssueId}
            onSelectIssue={setActiveIssueId}
            onClear={() => setIssues([])}
            onApplyFix={handleApplyFix}
          />
        </div>
      </div>

      {chatOpen && (
        <ChatSidebar
          promptId={promptId}
          promptContext={content}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
