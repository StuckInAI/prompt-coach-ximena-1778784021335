import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, RefreshCw, Sparkles, MessageSquare, X, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { usePromptStore } from '@/hooks/usePromptStore';
import type { Prompt } from '@/hooks/usePromptStore';
import { analyzeFeedback, type FeedbackIssue } from '@/lib/feedbackEngine';
import { getChatReply, type ChatMessage } from '@/lib/chatEngine';
import styles from './EditorPage.module.css';

function generateId() { return `prompt-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export default function EditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { prompts, upsertPrompt, preferences } = usePromptStore();

  const existingPrompt = id ? prompts.find((p) => p.id === id) : undefined;

  const [title, setTitle] = useState(existingPrompt?.title ?? '');
  const [content, setContent] = useState(existingPrompt?.content ?? '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [issues, setIssues] = useState<FeedbackIssue[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeIssue, setActiveIssue] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptIdRef = useRef<string>(existingPrompt?.id ?? generateId());
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load prompt when id changes
  useEffect(() => {
    if (existingPrompt) {
      setTitle(existingPrompt.title);
      setContent(existingPrompt.content);
      promptIdRef.current = existingPrompt.id;
    }
  }, [id]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const triggerAnalysis = useCallback((text: string) => {
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    if (!text.trim()) { setIssues([]); return; }
    analyzeTimerRef.current = setTimeout(() => {
      setAnalyzing(true);
      setTimeout(() => {
        const result = analyzeFeedback(text, preferences.feedbackSensitivity);
        setIssues(result);
        setAnalyzing(false);
      }, 400);
    }, 500);
  }, [preferences.feedbackSensitivity]);

  const triggerAutoSave = useCallback((newTitle: string, newContent: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      const prompt: Prompt = {
        id: promptIdRef.current,
        title: newTitle || 'Untitled',
        content: newContent,
        folderId: existingPrompt?.folderId ?? null,
        tags: existingPrompt?.tags ?? [],
        createdAt: existingPrompt?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      upsertPrompt(prompt);
      setSaveStatus('saved');
      if (!id) navigate(`/dashboard/editor/${promptIdRef.current}`, { replace: true });
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 2000);
  }, [existingPrompt, id, navigate, upsertPrompt]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerAnalysis(val);
    triggerAutoSave(title, val);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    triggerAutoSave(e.target.value, content);
  };

  const handleManualSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const prompt: Prompt = {
      id: promptIdRef.current,
      title: title || 'Untitled',
      content,
      folderId: existingPrompt?.folderId ?? null,
      tags: existingPrompt?.tags ?? [],
      createdAt: existingPrompt?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    upsertPrompt(prompt);
    setSaveStatus('saved');
    if (!id) navigate(`/dashboard/editor/${promptIdRef.current}`, { replace: true });
    toast.success('Prompt saved!');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleCopyFix = (suggestion: string, issueId: string) => {
    navigator.clipboard.writeText(suggestion).then(() => {
      setCopiedId(issueId);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    setChatMessages((m) => [...m, userMsg]);
    setChatInput('');
    setChatLoading(true);
    const reply = await getChatReply([...chatMessages, userMsg], content);
    setChatMessages((m) => [...m, { role: 'assistant', content: reply }]);
    setChatLoading(false);
  };

  // Render content with highlights as overlaid divs (simple approach: textarea + overlay)
  const renderHighlighted = () => {
    if (!issues.length || !content) return null;
    return issues.map((issue) => {
      const before = content.slice(0, issue.startIndex);
      const lines = before.split('\n');
      return (
        <mark
          key={issue.id}
          className={`${styles.mark} ${styles[`mark_${issue.type}`]} ${activeIssue === issue.id ? styles.markActive : ''}`}
          title={`${issue.shortLabel}: ${issue.explanation}`}
          onClick={() => setActiveIssue(issue.id === activeIssue ? null : issue.id)}
          style={{ '--line': lines.length - 1, '--col': lines[lines.length - 1].length } as React.CSSProperties}
        >
          {content.slice(issue.startIndex, issue.endIndex)}
        </mark>
      );
    });
  };

  const issueTypeColor = (type: FeedbackIssue['type']) =>
    type === 'vague' ? 'var(--warning)' : type === 'missing' ? 'var(--danger)' : 'var(--info)';

  return (
    <div className={styles.page}>
      <div className={styles.editorPane}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <input
            className={styles.titleInput}
            placeholder="Untitled prompt"
            value={title}
            onChange={handleTitleChange}
          />
          <div className={styles.toolbarRight}>
            {saveStatus === 'saving' && <span className={styles.saveHint}>Saving…</span>}
            {saveStatus === 'saved' && <span className={styles.saveHintSaved}>Saved ✓</span>}
            <button className={styles.iconBtn} onClick={handleManualSave} title="Save">
              <Save size={15} />
              <span>Save</span>
            </button>
            <button
              className={`${styles.iconBtn} ${chatOpen ? styles.iconBtnActive : ''}`}
              onClick={() => setChatOpen((o) => !o)}
              title="Chat coach"
            >
              <MessageSquare size={15} />
              <span>Chat</span>
            </button>
          </div>
        </div>

        {/* Editor area */}
        <div className={styles.editorWrap}>
          <div className={styles.editorInner}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Start typing your prompt here…\n\nExample: Write a concise product description for a SaaS tool that helps remote teams manage projects."
              value={content}
              onChange={handleContentChange}
              spellCheck
            />
            {/* Highlight overlay */}
            <div className={styles.highlightOverlay} aria-hidden>
              {renderHighlighted()}
            </div>
          </div>

          {/* Analysis status */}
          <div className={styles.analysisBar}>
            {analyzing ? (
              <span className={styles.analyzing}><RefreshCw size={12} className={styles.spin} /> Analyzing…</span>
            ) : issues.length > 0 ? (
              <span className={styles.issueCount}>{issues.length} issue{issues.length !== 1 ? 's' : ''} found</span>
            ) : content.trim() ? (
              <span className={styles.allGood}><Sparkles size={12} /> Looks good!</span>
            ) : null}
          </div>
        </div>

        {/* Issues panel */}
        {content.trim() && (
          <div className={styles.issuesPanel}>
            <button className={styles.issuesPanelHeader} onClick={() => setPanelOpen((o) => !o)}>
              <span className={styles.issuesPanelTitle}>
                Feedback
                {issues.length > 0 && <span className={styles.badge}>{issues.length}</span>}
              </span>
              <span className={styles.panelToggleRow}>
                {issues.length > 0 && (
                  <button
                    className={styles.clearBtn}
                    onClick={(e) => { e.stopPropagation(); setIssues([]); setActiveIssue(null); }}
                  >Clear</button>
                )}
                {panelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>
            {panelOpen && (
              <div className={styles.issuesList}>
                {issues.length === 0 ? (
                  <div className={styles.emptyIssues}>
                    <Sparkles size={18} />
                    <span>No issues — your prompt looks great!</span>
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`${styles.issueCard} ${activeIssue === issue.id ? styles.issueCardActive : ''}`}
                      onClick={() => {
                        setActiveIssue(issue.id === activeIssue ? null : issue.id);
                        textareaRef.current?.focus();
                      }}
                    >
                      <div className={styles.issueCardTop}>
                        <span className={styles.issueType} style={{ color: issueTypeColor(issue.type), borderColor: issueTypeColor(issue.type) }}>
                          {issue.type}
                        </span>
                        <span className={styles.issueLabel}>{issue.shortLabel}</span>
                      </div>
                      <p className={styles.issueExplanation}>{issue.explanation}</p>
                      {issue.suggestion && (
                        <div className={styles.issueSuggestion}>
                          <span className={styles.suggestionLabel}>Suggestion:</span>
                          <span>{issue.suggestion}</span>
                          <button
                            className={styles.copyBtn}
                            onClick={(e) => { e.stopPropagation(); handleCopyFix(issue.suggestion, issue.id); }}
                            title="Copy suggestion"
                          >
                            {copiedId === issue.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat sidebar */}
      {chatOpen && (
        <div className={styles.chatSidebar}>
          <div className={styles.chatHeader}>
            <span className={styles.chatTitle}><MessageSquare size={14} /> Chat Coach</span>
            <button className={styles.chatClose} onClick={() => setChatOpen(false)}><X size={14} /></button>
          </div>
          <div className={styles.chatMessages}>
            {chatMessages.length === 0 && (
              <div className={styles.chatEmpty}>
                <MessageSquare size={24} />
                <p>Ask me anything about your prompt.<br />I can explain, improve, or rewrite it.</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`${styles.chatMsg} ${msg.role === 'user' ? styles.chatMsgUser : styles.chatMsgAssistant}`}>
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div className={`${styles.chatMsg} ${styles.chatMsgAssistant} ${styles.typing}`}>
                <span /><span /><span />
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
          <div className={styles.chatInputRow}>
            <textarea
              className={styles.chatInput}
              placeholder="Ask about your prompt…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); }
              }}
              rows={2}
            />
            <button className={styles.chatSend} onClick={handleSendChat} disabled={chatLoading}>
              <Sparkles size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
