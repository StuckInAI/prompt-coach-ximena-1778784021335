export type IssueType = 'vague' | 'missing' | 'improvement';

export type FeedbackIssue = {
  id: string;
  startIndex: number;
  endIndex: number;
  type: IssueType;
  shortLabel: string;
  explanation: string;
  suggestion: string;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: number;
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

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  promptId: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export type UseCase = 'chatgpt' | 'system-prompt' | 'both';
export type Sensitivity = 'standard' | 'strict';

export type Preferences = {
  useCase: UseCase;
  sensitivity: Sensitivity;
  displayName: string;
};
