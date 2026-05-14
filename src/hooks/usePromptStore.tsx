import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ChatMessage, Folder, Preferences, Prompt, Tag } from '@/types';
import { loadJSON, saveJSON } from '@/lib/storage';
import { uid } from '@/lib/id';

type StoreState = {
  prompts: Prompt[];
  folders: Folder[];
  tags: Tag[];
  chats: Record<string, ChatMessage[]>;
  preferences: Preferences;
};

type StoreContextValue = StoreState & {
  createPrompt: (init?: Partial<Prompt>) => Prompt;
  updatePrompt: (id: string, patch: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;
  getPrompt: (id: string) => Prompt | undefined;

  createFolder: (name: string) => Folder;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  createTag: (name: string, color: string) => Tag;
  deleteTag: (id: string) => void;
  togglePromptTag: (promptId: string, tagId: string) => void;

  addChatMessage: (promptId: string, role: 'user' | 'assistant', content: string) => ChatMessage;
  getChat: (promptId: string) => ChatMessage[];
  clearChat: (promptId: string) => void;

  updatePreferences: (patch: Partial<Preferences>) => void;
  resetAll: () => void;
};

const DEFAULT_PREFS: Preferences = {
  useCase: 'both',
  sensitivity: 'standard',
  displayName: 'Founder',
};

const SEED_TAGS: Tag[] = [
  { id: 'tag_marketing', name: 'Marketing', color: '#f6a93b' },
  { id: 'tag_product', name: 'Product', color: '#7c5cff' },
  { id: 'tag_research', name: 'Research', color: '#3ecf8e' },
];

const SEED_FOLDERS: Folder[] = [
  { id: 'folder_drafts', name: 'Drafts', createdAt: Date.now() },
];

const StoreContext = createContext<StoreContextValue | null>(null);

export function PromptStoreProvider({ children }: { children: ReactNode }) {
  const [prompts, setPrompts] = useState<Prompt[]>(() => loadJSON<Prompt[]>('prompts', []));
  const [folders, setFolders] = useState<Folder[]>(() => loadJSON<Folder[]>('folders', SEED_FOLDERS));
  const [tags, setTags] = useState<Tag[]>(() => loadJSON<Tag[]>('tags', SEED_TAGS));
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>(() => loadJSON<Record<string, ChatMessage[]>>('chats', {}));
  const [preferences, setPreferences] = useState<Preferences>(() => loadJSON<Preferences>('prefs', DEFAULT_PREFS));

  useEffect(() => { saveJSON('prompts', prompts); }, [prompts]);
  useEffect(() => { saveJSON('folders', folders); }, [folders]);
  useEffect(() => { saveJSON('tags', tags); }, [tags]);
  useEffect(() => { saveJSON('chats', chats); }, [chats]);
  useEffect(() => { saveJSON('prefs', preferences); }, [preferences]);

  const createPrompt = useCallback((init?: Partial<Prompt>): Prompt => {
    const now = Date.now();
    const p: Prompt = {
      id: uid('prm'),
      title: 'Untitled prompt',
      content: '',
      folderId: null,
      tagIds: [],
      createdAt: now,
      updatedAt: now,
      ...init,
    };
    setPrompts((prev) => [p, ...prev]);
    return p;
  }, []);

  const updatePrompt = useCallback((id: string, patch: Partial<Prompt>) => {
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)));
  }, []);

  const deletePrompt = useCallback((id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    setChats((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const getPrompt = useCallback((id: string) => prompts.find((p) => p.id === id), [prompts]);

  const createFolder = useCallback((name: string): Folder => {
    const f: Folder = { id: uid('fld'), name, createdAt: Date.now() };
    setFolders((prev) => [...prev, f]);
    return f;
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setPrompts((prev) => prev.map((p) => (p.folderId === id ? { ...p, folderId: null } : p)));
  }, []);

  const createTag = useCallback((name: string, color: string): Tag => {
    const t: Tag = { id: uid('tag'), name, color };
    setTags((prev) => [...prev, t]);
    return t;
  }, []);

  const deleteTag = useCallback((id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    setPrompts((prev) => prev.map((p) => ({ ...p, tagIds: p.tagIds.filter((tid) => tid !== id) })));
  }, []);

  const togglePromptTag = useCallback((promptId: string, tagId: string) => {
    setPrompts((prev) => prev.map((p) => {
      if (p.id !== promptId) return p;
      const has = p.tagIds.includes(tagId);
      return {
        ...p,
        tagIds: has ? p.tagIds.filter((t) => t !== tagId) : [...p.tagIds, tagId],
        updatedAt: Date.now(),
      };
    }));
  }, []);

  const addChatMessage = useCallback((promptId: string, role: 'user' | 'assistant', content: string): ChatMessage => {
    const msg: ChatMessage = { id: uid('msg'), promptId, role, content, createdAt: Date.now() };
    setChats((prev) => ({ ...prev, [promptId]: [...(prev[promptId] ?? []), msg] }));
    return msg;
  }, []);

  const getChat = useCallback((promptId: string) => chats[promptId] ?? [], [chats]);

  const clearChat = useCallback((promptId: string) => {
    setChats((prev) => {
      const next = { ...prev };
      delete next[promptId];
      return next;
    });
  }, []);

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetAll = useCallback(() => {
    setPrompts([]);
    setFolders(SEED_FOLDERS);
    setTags(SEED_TAGS);
    setChats({});
    setPreferences(DEFAULT_PREFS);
  }, []);

  const value = useMemo<StoreContextValue>(() => ({
    prompts, folders, tags, chats, preferences,
    createPrompt, updatePrompt, deletePrompt, getPrompt,
    createFolder, renameFolder, deleteFolder,
    createTag, deleteTag, togglePromptTag,
    addChatMessage, getChat, clearChat,
    updatePreferences, resetAll,
  }), [
    prompts, folders, tags, chats, preferences,
    createPrompt, updatePrompt, deletePrompt, getPrompt,
    createFolder, renameFolder, deleteFolder,
    createTag, deleteTag, togglePromptTag,
    addChatMessage, getChat, clearChat,
    updatePreferences, resetAll,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePromptStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('usePromptStore must be used within PromptStoreProvider');
  return ctx;
}
