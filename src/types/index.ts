export type IssueType = 'vague' | 'missing' | 'improvement';

export interface FeedbackIssue {
  id: string;
  ruleId: string;
  type: IssueType;
  shortLabel: string;
  explanation: string;
  suggestion: string;
  matchedText: string;
  startIndex: number;
  endIndex: number;
}

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

export interface ImprovedPromptResult {
  improved: string;
  changeCount: number;
}
