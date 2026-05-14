import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Trash2, Tag as TagIcon } from 'lucide-react';
import { toast } from 'sonner';
import { usePromptStore } from '@/hooks/usePromptStore';

export default function LibraryPage() {
  const store = usePromptStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState<string>('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.prompts.filter((p) => {
      if (activeTag && !p.tagIds.includes(activeTag)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      );
    });
  }, [store.prompts, query, activeTag]);

  const handleCreate = () => {
    const p = store.createPrompt();
    navigate(`/dashboard/editor/${p.id}`);
  };

  const handleDelete = (id: string, title: string) => {
    store.deletePrompt(id);
    toast.success(`Deleted "${title}"`);
  };

  return (
    <div style={{ padding: '24px 32px', height: '100%', overflow: 'auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Library</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '4px 0 0' }}>
            All your saved prompts in one place.
          </p>
        </div>
        <button
          onClick={handleCreate}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--accent)', color: 'white',
            border: 0, borderRadius: 8, padding: '8px 14px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> New prompt
        </button>
      </header>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '7px 12px', flex: 1, minWidth: 260,
        }}>
          <Search size={14} color="var(--text-dim)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts…"
            style={{
              background: 'transparent', border: 0, outline: 'none',
              color: 'var(--text)', fontSize: 13.5, flex: 1,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTag(null)}
            style={{
              background: activeTag === null ? 'var(--accent-soft)' : 'transparent',
              color: activeTag === null ? '#c4b1ff' : 'var(--text-muted)',
              border: '1px solid var(--border)', borderRadius: 999,
              padding: '5px 11px', fontSize: 12, cursor: 'pointer',
            }}
          >
            All
          </button>
          {store.tags.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTag(activeTag === t.id ? null : t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: activeTag === t.id ? 'var(--accent-soft)' : 'transparent',
                color: activeTag === t.id ? '#c4b1ff' : 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 999,
                padding: '5px 11px', fontSize: 12, cursor: 'pointer',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-elev)', border: '1px dashed var(--border)',
          borderRadius: 12, color: 'var(--text-muted)',
        }}>
          <FileText size={28} />
          <div style={{ fontWeight: 600, color: 'var(--text)', marginTop: 10 }}>
            {store.prompts.length === 0 ? 'No prompts yet' : 'No prompts match'}
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {store.prompts.length === 0
              ? 'Create your first prompt to get started.'
              : 'Try a different search or tag filter.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map((p) => {
            const promptTags = store.tags.filter((t) => p.tagIds.includes(t.id));
            return (
              <div
                key={p.id}
                style={{
                  background: 'var(--bg-elev)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 14, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  transition: 'border-color 0.12s',
                }}
                onClick={() => navigate(`/dashboard/editor/${p.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title || 'Untitled prompt'}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.title); }}
                    style={{
                      background: 'transparent', border: 0, color: 'var(--text-dim)',
                      cursor: 'pointer', padding: 2,
                    }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{
                  fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {p.content || <em style={{ color: 'var(--text-dim)' }}>Empty prompt</em>}
                </div>
                {promptTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {promptTags.map((t) => (
                      <span key={t.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 10.5, padding: '2px 7px', borderRadius: 999,
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                      }}>
                        <TagIcon size={9} color={t.color} />
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 'auto' }}>
                  Updated {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
