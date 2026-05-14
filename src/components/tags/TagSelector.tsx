import { useState } from 'react';
import { Plus, X, Tag as TagIcon, Check } from 'lucide-react';
import { usePromptStore } from '@/hooks/usePromptStore';

type TagSelectorProps = {
  promptId: string;
  tagIds: string[];
};

const TAG_COLORS = ['#7c5cff', '#f6a93b', '#3ecf8e', '#3b82f6', '#ef4444', '#ec4899'];

export default function TagSelector({ promptId, tagIds }: TagSelectorProps) {
  const store = usePromptStore();
  const [open, setOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newColor, setNewColor] = useState<string>(TAG_COLORS[0]);

  const selectedTags = store.tags.filter((t) => tagIds.includes(t.id));

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const tag = store.createTag(name, newColor);
    store.togglePromptTag(promptId, tag.id);
    setNewName('');
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {selectedTags.map((t) => (
        <span
          key={t.id}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, padding: '3px 8px',
            borderRadius: 999,
            background: 'var(--bg-elev-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.color }} />
          {t.name}
          <button
            onClick={() => store.togglePromptTag(promptId, t.id)}
            style={{
              background: 'transparent', border: 0, padding: 0,
              cursor: 'pointer', color: 'var(--text-dim)',
              display: 'inline-flex',
            }}
            title="Remove"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, padding: '3px 8px',
          background: 'transparent',
          border: '1px dashed var(--border-strong)',
          color: 'var(--text-muted)',
          borderRadius: 999, cursor: 'pointer',
        }}
      >
        <Plus size={10} /> Tag
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          />
          <div
            style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 60,
              background: 'var(--bg-elev-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: 10, padding: 10,
              width: 240,
              boxShadow: 'var(--shadow)',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
              Apply tag
            </div>
            {store.tags.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No tags yet. Create one below.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 180, overflowY: 'auto' }}>
              {store.tags.map((t) => {
                const isSelected = tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => store.togglePromptTag(promptId, t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', borderRadius: 6,
                      background: isSelected ? 'var(--accent-soft)' : 'transparent',
                      border: 0, cursor: 'pointer',
                      color: 'var(--text)', fontSize: 12.5,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{t.name}</span>
                    {isSelected && <Check size={12} color="#c4b1ff" />}
                  </button>
                );
              })}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                New tag
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: c, cursor: 'pointer',
                      border: newColor === c ? '2px solid var(--text)' : '2px solid transparent',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                  placeholder="Tag name"
                  style={{
                    flex: 1,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '5px 8px',
                    color: 'var(--text)', fontSize: 12,
                    fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  style={{
                    background: 'var(--accent)', color: 'white',
                    border: 0, borderRadius: 6,
                    padding: '0 10px', cursor: 'pointer',
                    fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <TagIcon size={11} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
