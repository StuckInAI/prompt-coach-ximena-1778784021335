export type UseCase = 'chat' | 'system' | 'both';

export type Sensitivity = 'gentle' | 'standard' | 'strict';

export type IssueType = 'vague' | 'missing' | 'improvement';

export type FeedbackIssue = {
  id: string;
  type: IssueType;
  shortLabel: string;
  explanation: string;
  suggestion: string;
  startIndex: number;
  endIndex: number;
  ruleId: string;
  matchedText: string;
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

export type Preferences = {
  useCase: UseCase;
  sensitivity: Sensitivity;
  displayName: string;
};
