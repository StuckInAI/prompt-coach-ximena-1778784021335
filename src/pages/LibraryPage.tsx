import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, FolderOpen, Trash2, Edit2, Check, X, FileText, Tag as TagIcon, Search } from 'lucide-react';
import { usePromptStore } from '@/hooks/usePromptStore';
import type { Prompt } from '@/hooks/usePromptStore';
import { toast } from 'sonner';
import styles from './LibraryPage.module.css';

export default function LibraryPage() {
  const navigate = useNavigate();
  const { prompts, folders, tags, addFolder, renameFolder, deleteFolder, deletePrompt } = usePromptStore();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const handleAddFolder = () => {
    const f = addFolder('New Folder');
    setEditingFolder(f.id);
    setFolderName(f.name);
  };

  const handleRenameCommit = (id: string) => {
    if (folderName.trim()) renameFolder(id, folderName.trim());
    setEditingFolder(null);
  };

  const handleDeleteFolder = (id: string) => {
    deleteFolder(id);
    if (selectedFolder === id) setSelectedFolder(null);
    toast.success('Folder deleted');
  };

  const filtered = prompts.filter((p) => {
    if (selectedFolder !== null && p.folderId !== selectedFolder) return false;
    if (filterTag && !p.tags.includes(filterTag)) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={styles.page}>
      {/* Folder sidebar */}
      <aside className={styles.folderPanel}>
        <div className={styles.folderHeader}>
          <span className={styles.folderHeaderTitle}>Folders</span>
          <button className={styles.addFolderBtn} onClick={handleAddFolder} title="New folder">
            <Plus size={14} />
          </button>
        </div>
        <div className={styles.folderList}>
          <button
            className={`${styles.folderItem} ${selectedFolder === null ? styles.folderItemActive : ''}`}
            onClick={() => setSelectedFolder(null)}
          >
            <FolderOpen size={14} />
            <span>All prompts</span>
            <span className={styles.folderCount}>{prompts.length}</span>
          </button>
          {folders.map((f) => (
            <div key={f.id} className={`${styles.folderItem} ${selectedFolder === f.id ? styles.folderItemActive : ''}`}>
              {editingFolder === f.id ? (
                <>
                  <input
                    autoFocus
                    className={styles.folderInput}
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameCommit(f.id);
                      if (e.key === 'Escape') setEditingFolder(null);
                    }}
                  />
                  <button className={styles.folderAction} onClick={() => handleRenameCommit(f.id)}><Check size={12} /></button>
                  <button className={styles.folderAction} onClick={() => setEditingFolder(null)}><X size={12} /></button>
                </>
              ) : (
                <>
                  <button className={styles.folderBtn} onClick={() => setSelectedFolder(f.id)}>
                    <Folder size={14} />
                    <span>{f.name}</span>
                    <span className={styles.folderCount}>{prompts.filter((p) => p.folderId === f.id).length}</span>
                  </button>
                  <button className={styles.folderAction} onClick={() => { setEditingFolder(f.id); setFolderName(f.name); }}><Edit2 size={11} /></button>
                  <button className={styles.folderAction} onClick={() => handleDeleteFolder(f.id)}><Trash2 size={11} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className={styles.main}>
        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.search}
              placeholder="Search prompts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.tagFilters}>
            <button
              className={`${styles.tagChip} ${filterTag === null ? styles.tagChipActive : ''}`}
              onClick={() => setFilterTag(null)}
            >All</button>
            {tags.map((t) => (
              <button
                key={t.id}
                className={`${styles.tagChip} ${filterTag === t.id ? styles.tagChipActive : ''}`}
                style={filterTag === t.id ? { background: t.color + '33', borderColor: t.color, color: t.color } : {}}
                onClick={() => setFilterTag(filterTag === t.id ? null : t.id)}
              >
                <TagIcon size={11} /> {t.name}
              </button>
            ))}
          </div>
          <button className={styles.newPromptBtn} onClick={() => navigate('/dashboard/editor')}>
            <Plus size={14} /> New prompt
          </button>
        </div>

        {/* Prompt grid */}
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={32} />
            <p>{prompts.length === 0 ? "No prompts yet. Create your first one in the Editor!" : "No prompts match your filters."}</p>
            <button className={styles.newPromptBtn} onClick={() => navigate('/dashboard/editor')}>
              <Plus size={14} /> New prompt
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                tags={tags}
                onOpen={() => navigate(`/dashboard/editor/${p.id}`)}
                onDelete={() => { deletePrompt(p.id); toast.success('Prompt deleted'); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PromptCard({
  prompt, tags, onOpen, onDelete,
}: {
  prompt: Prompt;
  tags: { id: string; name: string; color: string }[];
  onOpen: () => void;
  onDelete: () => void;
}) {
  const excerpt = prompt.content.slice(0, 120) + (prompt.content.length > 120 ? '…' : '');
  const promptTags = tags.filter((t) => prompt.tags.includes(t.id));
  const date = new Date(prompt.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={styles.card}>
      <div className={styles.cardMain} onClick={onOpen}>
        <div className={styles.cardTitle}>{prompt.title || 'Untitled'}</div>
        <div className={styles.cardExcerpt}>{excerpt || <em>Empty prompt</em>}</div>
        {promptTags.length > 0 && (
          <div className={styles.cardTags}>
            {promptTags.map((t) => (
              <span key={t.id} className={styles.cardTag} style={{ background: t.color + '22', color: t.color, borderColor: t.color + '55' }}>
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className={styles.cardFoot}>
        <span className={styles.cardDate}>{date}</span>
        <button className={styles.deleteBtn} onClick={onDelete} title="Delete"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
