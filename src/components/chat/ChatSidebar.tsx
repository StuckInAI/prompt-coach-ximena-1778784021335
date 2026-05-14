import { useEffect, useRef, useState } from 'react';
import { Send, X, Trash2, Bot, User as UserIcon } from 'lucide-react';
import styles from './ChatSidebar.module.css';
import { usePromptStore } from '@/hooks/usePromptStore';
import { generateChatReply } from '@/lib/feedbackEngine';

type ChatSidebarProps = {
  promptId: string;
  promptContext: string;
  onClose: () => void;
};

export default function ChatSidebar({ promptId, promptContext, onClose }: ChatSidebarProps) {
  const store = usePromptStore();
  const messages = store.getChat(promptId);
  const [input, setInput] = useState<string>('');
  const [typing, setTyping] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, typing]);

  const send = () => {
    const text = input.trim();
    if (!text || typing) return;
    store.addChatMessage(promptId, 'user', text);
    setInput('');
    setTyping(true);
    // Simulate streaming delay
    const delay = 600 + Math.min(1200, text.length * 8);
    setTimeout(() => {
      const reply = generateChatReply(text, promptContext);
      store.addChatMessage(promptId, 'assistant', reply);
      setTyping(false);
    }, delay);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <aside className={styles.sidebar}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.botIcon}><Bot size={14} /></div>
          <div>
            <div className={styles.title}>Prompt coach</div>
            <div className={styles.sub}>Conversational help</div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {messages.length > 0 && (
            <button className={styles.iconBtn} onClick={() => store.clearChat(promptId)} title="Clear chat">
              <Trash2 size={14} />
            </button>
          )}
          <button className={styles.iconBtn} onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </header>
      <div className={styles.scroll} ref={scrollRef}>
        {messages.length === 0 && !typing && (
          <div className={styles.empty}>
            <Bot size={22} />
            <div className={styles.emptyTitle}>Ask me anything</div>
            <div className={styles.emptyBody}>
              Try: <em>“How can I improve this?”</em>, <em>“Give me an example”</em>, or <em>“Why does a role matter?”</em>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={styles.message} data-role={m.role}>
            <div className={styles.avatar} data-role={m.role}>
              {m.role === 'user' ? <UserIcon size={12} /> : <Bot size={12} />}
            </div>
            <div className={styles.bubble}>
              {m.content.split('\n').map((line, i) => (
                <div key={i} className={styles.line}>{line || '\u00A0'}</div>
              ))}
            </div>
          </div>
        ))}
        {typing && (
          <div className={styles.message} data-role="assistant">
            <div className={styles.avatar} data-role="assistant"><Bot size={12} /></div>
            <div className={styles.bubble}>
              <div className={styles.typing}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className={styles.composer}>
        <textarea
          className={styles.input}
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask the coach…"
          rows={2}
        />
        <button className={styles.sendBtn} onClick={send} disabled={!input.trim() || typing}>
          <Send size={14} />
        </button>
      </div>
    </aside>
  );
}
