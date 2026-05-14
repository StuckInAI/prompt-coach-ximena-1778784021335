import { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { nanoid } from '@/lib/id';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Preferences {
  displayName: string;
  useCase: 'chatgpt' | 'system-prompt' | 'both';
  feedbackSensitivity: 'standard' | 'strict';
}

interface State {
  prompts: Prompt[];
  folders: Folder[];
  tags: Tag[];
  preferences: Preferences;
  chats: Record<string, ChatMessage[]>;
}

type Action =
  | { type: 'SET_STATE'; payload: State }
  | { type: 'UPSERT_PROMPT'; payload: Prompt }
  | { type: 'DELETE_PROMPT'; id: string }
  | { type: 'ADD_FOLDER'; payload: Folder }
  | { type: 'RENAME_FOLDER'; id: string; name: string }
  | { type: 'DELETE_FOLDER'; id: string }
  | { type: 'ADD_TAG'; payload: Tag }
  | { type: 'DELETE_TAG'; id: string }
  | { type: 'TOGGLE_PROMPT_TAG'; promptId: string; tagId: string }
  | { type: 'SET_PREFERENCES'; payload: Partial<Preferences> }
  | { type: 'ADD_CHAT_MESSAGE'; promptId: string; message: ChatMessage }
  | { type: 'CLEAR_CHAT'; promptId: string };

const defaultState: State = {
  prompts: [],
  folders: [],
  tags: [
    { id: 'tag-1', name: 'Marketing', color: '#f6a93b' },
    { id: 'tag-2', name: 'Dev', color: '#3b82f6' },
    { id: 'tag-3', name: 'Writing', color: '#3ecf8e' },
  ],
  preferences: {
    displayName: 'User',
    useCase: 'chatgpt',
    feedbackSensitivity: 'standard',
  },
  chats: {},
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STATE': return { ...defaultState, ...action.payload, chats: action.payload.chats ?? {} };
    case 'UPSERT_PROMPT': {
      const idx = state.prompts.findIndex((p) => p.id === action.payload.id);
      const prompts = idx >= 0
        ? state.prompts.map((p, i) => (i === idx ? action.payload : p))
        : [action.payload, ...state.prompts];
      return { ...state, prompts };
    }
    case 'DELETE_PROMPT':
      return { ...state, prompts: state.prompts.filter((p) => p.id !== action.id) };
    case 'ADD_FOLDER':
      return { ...state, folders: [...state.folders, action.payload] };
    case 'RENAME_FOLDER':
      return { ...state, folders: state.folders.map((f) => f.id === action.id ? { ...f, name: action.name } : f) };
    case 'DELETE_FOLDER':
      return {
        ...state,
        folders: state.folders.filter((f) => f.id !== action.id),
        prompts: state.prompts.map((p) => p.folderId === action.id ? { ...p, folderId: null } : p),
      };
    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, action.payload] };
    case 'DELETE_TAG':
      return {
        ...state,
        tags: state.tags.filter((t) => t.id !== action.id),
        prompts: state.prompts.map((p) => ({ ...p, tags: p.tags.filter((t) => t !== action.id) })),
      };
    case 'TOGGLE_PROMPT_TAG': {
      const prompts = state.prompts.map((p) => {
        if (p.id !== action.promptId) return p;
        const has = p.tags.includes(action.tagId);
        return { ...p, tags: has ? p.tags.filter((t) => t !== action.tagId) : [...p.tags, action.tagId] };
      });
      return { ...state, prompts };
    }
    case 'SET_PREFERENCES':
      return { ...state, preferences: { ...state.preferences, ...action.payload } };
    case 'ADD_CHAT_MESSAGE': {
      const prev = state.chats[action.promptId] ?? [];
      return { ...state, chats: { ...state.chats, [action.promptId]: [...prev, action.message] } };
    }
    case 'CLEAR_CHAT': {
      const chats = { ...state.chats };
      delete chats[action.promptId];
      return { ...state, chats };
    }
    default: return state;
  }
}

interface ContextValue extends State {
  upsertPrompt: (p: Prompt) => void;
  deletePrompt: (id: string) => void;
  addFolder: (name: string) => Folder;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  addTag: (name: string, color: string) => Tag;
  deleteTag: (id: string) => void;
  createTag: (name: string, color: string) => Tag;
  togglePromptTag: (promptId: string, tagId: string) => void;
  setPreferences: (p: Partial<Preferences>) => void;
  getChat: (promptId: string) => ChatMessage[];
  addChatMessage: (promptId: string, role: 'user' | 'assistant', content: string) => void;
  clearChat: (promptId: string) => void;
}

const Ctx = createContext<ContextValue | null>(null);

export function PromptStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('promptcoach-store');
      if (raw) dispatch({ type: 'SET_STATE', payload: JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('promptcoach-store', JSON.stringify(state));
  }, [state]);

  const upsertPrompt = (p: Prompt) => dispatch({ type: 'UPSERT_PROMPT', payload: p });
  const deletePrompt = (id: string) => dispatch({ type: 'DELETE_PROMPT', id });
  const addFolder = (name: string): Folder => {
    const f: Folder = { id: `folder-${Date.now()}`, name, createdAt: Date.now() };
    dispatch({ type: 'ADD_FOLDER', payload: f });
    return f;
  };
  const renameFolder = (id: string, name: string) => dispatch({ type: 'RENAME_FOLDER', id, name });
  const deleteFolder = (id: string) => dispatch({ type: 'DELETE_FOLDER', id });
  const addTag = (name: string, color: string): Tag => {
    const t: Tag = { id: `tag-${Date.now()}`, name, color };
    dispatch({ type: 'ADD_TAG', payload: t });
    return t;
  };
  const deleteTag = (id: string) => dispatch({ type: 'DELETE_TAG', id });
  const createTag = (name: string, color: string): Tag => {
    const t: Tag = { id: nanoid(), name, color };
    dispatch({ type: 'ADD_TAG', payload: t });
    return t;
  };
  const togglePromptTag = (promptId: string, tagId: string) =>
    dispatch({ type: 'TOGGLE_PROMPT_TAG', promptId, tagId });
  const setPreferences = (p: Partial<Preferences>) => dispatch({ type: 'SET_PREFERENCES', payload: p });
  const getChat = (promptId: string): ChatMessage[] => state.chats[promptId] ?? [];
  const addChatMessage = (promptId: string, role: 'user' | 'assistant', content: string) => {
    const message: ChatMessage = { id: nanoid(), role, content, timestamp: Date.now() };
    dispatch({ type: 'ADD_CHAT_MESSAGE', promptId, message });
  };
  const clearChat = (promptId: string) => dispatch({ type: 'CLEAR_CHAT', promptId });

  return (
    <Ctx.Provider value={{
      ...state,
      upsertPrompt,
      deletePrompt,
      addFolder,
      renameFolder,
      deleteFolder,
      addTag,
      deleteTag,
      createTag,
      togglePromptTag,
      setPreferences,
      getChat,
      addChatMessage,
      clearChat,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePromptStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePromptStore must be used within PromptStoreProvider');
  return ctx;
}
