export type IssueType = 'vague' | 'missing' | 'improvement';

export type FeedbackIssue = {
  id: string;
  type: IssueType;
  startIndex: number;
  endIndex: number;
  shortLabel: string;
  explanation: string;
  suggestion: string;
  /** If set, applying the fix replaces the highlighted range with this text */
  replacement?: string;
  /** If set, applying the fix appends this text to the end of the prompt */
  appendText?: string;
};

export type Prompt = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tagIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: number;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type ChatMessage = {
  id: string;
  promptId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

export type UseCase = 'work' | 'personal' | 'both';
export type Sensitivity = 'gentle' | 'standard' | 'strict';

export type Preferences = {
  useCase: UseCase;
  sensitivity: Sensitivity;
  displayName: string;
};
