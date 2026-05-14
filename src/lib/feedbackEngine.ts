import type { FeedbackIssue, IssueType, UseCase } from '@/types';
import { uid } from '@/lib/id';

type Rule = {
  id: string;
  type: IssueType;
  shortLabel: string;
  explanation: string;
  suggestion: string;
  pattern?: RegExp;
  appliesTo: UseCase[];
  minSensitivity?: 'gentle' | 'standard' | 'strict';
};

const SENSITIVITY_ORDER: Record<'gentle' | 'standard' | 'strict', number> = {
  gentle: 0,
  standard: 1,
  strict: 2,
};

const VAGUE_RULES: Rule[] = [
  {
    id: 'vague-good',
    type: 'vague',
    shortLabel: 'Vague word: "good"',
    explanation: '"Good" is subjective. Replace it with concrete criteria the model can evaluate.',
    suggestion: 'Specify what makes it good — e.g., "concise (under 100 words), persuasive, and tailored to founders."',
    pattern: /\b(good|nice|great|cool|awesome|amazing)\b/gi,
    appliesTo: ['chat', 'system', 'both'],
    minSensitivity: 'gentle',
  },
  {
    id: 'vague-stuff',
    type: 'vague',
    shortLabel: 'Vague word: "stuff"',
    explanation: '"Stuff" or "things" forces the model to guess what you mean.',
    suggestion: 'Replace with the specific items, topics, or categories you want covered.',
    pattern: /\b(stuff|things|something)\b/gi,
    appliesTo: ['chat', 'system', 'both'],
    minSensitivity: 'gentle',
  },
  {
    id: 'vague-short',
    type: 'vague',
    shortLabel: 'Vague length',
    explanation: '"Short" or "long" is ambiguous. Give the model a concrete length target.',
    suggestion: 'Use a specific length, e.g., "under 150 words" or "3–5 bullet points."',
    pattern: /\b(short|long|brief|lengthy)\b/gi,
    appliesTo: ['chat', 'system', 'both'],
    minSensitivity: 'standard',
  },
  {
    id: 'vague-asap',
    type: 'vague',
    shortLabel: 'Vague urgency',
    explanation: 'Models do not perceive urgency. Replace with quality/output expectations.',
    suggestion: 'Drop urgency words and describe the desired output shape instead.',
    pattern: /\b(asap|quickly|fast|soon)\b/gi,
    appliesTo: ['chat', 'both'],
    minSensitivity: 'standard',
  },
  {
    id: 'vague-help',
    type: 'vague',
    shortLabel: 'Vague request: "help me"',
    explanation: '"Help me" without a specific task leaves the model guessing.',
    suggestion: 'State the concrete action: write, summarize, critique, brainstorm, etc.',
    pattern: /\b(help me|can you help)\b/gi,
    appliesTo: ['chat', 'both'],
    minSensitivity: 'gentle',
  },
  {
    id: 'vague-etc',
    type: 'vague',
    shortLabel: 'Trailing "etc."',
    explanation: '"Etc." hides the items you actually want. Be explicit.',
    suggestion: 'List the remaining items, or describe the category precisely.',
    pattern: /\b(etc\.?|and so on)\b/gi,
    appliesTo: ['chat', 'system', 'both'],
    minSensitivity: 'strict',
  },
];

export function analyzePrompt(
  text: string,
  useCase: UseCase = 'both',
  sensitivity: 'gentle' | 'standard' | 'strict' = 'standard'
): FeedbackIssue[] {
  const issues: FeedbackIssue[] = [];
  if (!text || !text.trim()) return issues;

  const sensLevel = SENSITIVITY_ORDER[sensitivity];

  // Vague word matches
  for (const rule of VAGUE_RULES) {
    if (!rule.pattern) continue;
    if (!ruleAppliesToUseCase(rule, useCase)) continue;
    if (rule.minSensitivity && SENSITIVITY_ORDER[rule.minSensitivity] > sensLevel) continue;

    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      issues.push({
        id: uid('iss'),
        type: rule.type,
        shortLabel: rule.shortLabel,
        explanation: rule.explanation,
        suggestion: rule.suggestion,
        startIndex: start,
        endIndex: end,
        ruleId: rule.id,
        matchedText: m[0],
      });
      if (m[0].length === 0) rule.pattern.lastIndex++;
    }
  }

  // Missing structural elements
  const missingRules = detectMissingStructure(text, useCase, sensLevel);
  for (const rule of missingRules) {
    issues.push({
      id: uid('iss'),
      type: rule.type,
      shortLabel: rule.shortLabel,
      explanation: rule.explanation,
      suggestion: rule.suggestion,
      startIndex: 0,
      endIndex: Math.min(text.length, 40),
      ruleId: rule.id,
      matchedText: text.slice(0, Math.min(text.length, 40)),
    });
  }

  return issues;
}

function ruleAppliesToUseCase(rule: Rule, useCase: UseCase): boolean {
  if (useCase === 'both') return true;
  return rule.appliesTo.includes(useCase) || rule.appliesTo.includes('both');
}

function detectMissingStructure(
  text: string,
  useCase: UseCase,
  sensLevel: number
): Rule[] {
  const out: Rule[] = [];
  const lower = text.toLowerCase();

  const hasRole = /\b(you are|act as|you're|your role)\b/i.test(text);
  const hasFormat = /\b(list|bullet|table|json|markdown|paragraph|numbered|format|under \d+ words?)\b/i.test(text);
  const hasAudience = /\b(audience|for (a|an|the) [a-z]+|targeted at|aimed at|reader)\b/i.test(text);
  const hasContext = /\b(context|background|i'm|i am|we are|we're|currently|trying to)\b/i.test(lower);

  if (!hasRole && sensLevel >= SENSITIVITY_ORDER.standard && (useCase === 'system' || useCase === 'both')) {
    out.push({
      id: 'missing-role',
      type: 'missing',
      shortLabel: 'Missing role',
      explanation: 'You have not told the model who it should be. Setting a role grounds tone and expertise.',
      suggestion: 'Add a role like: "You are a senior copywriter specialized in B2B SaaS."',
      appliesTo: ['system', 'both'],
    });
  }
  if (!hasFormat && sensLevel >= SENSITIVITY_ORDER.gentle) {
    out.push({
      id: 'missing-format',
      type: 'missing',
      shortLabel: 'Missing output format',
      explanation: 'Without a format, the model picks one for you. Specifying format makes output predictable.',
      suggestion: 'Add a format spec: "Respond as a numbered list of 5 items, each under 30 words."',
      appliesTo: ['chat', 'system', 'both'],
    });
  }
  if (!hasAudience && sensLevel >= SENSITIVITY_ORDER.standard) {
    out.push({
      id: 'missing-audience',
      type: 'missing',
      shortLabel: 'Missing audience',
      explanation: 'Without an audience, tone and depth become guesswork.',
      suggestion: 'State the audience: "The audience is non-technical startup founders."',
      appliesTo: ['chat', 'system', 'both'],
    });
  }
  if (!hasContext && sensLevel >= SENSITIVITY_ORDER.strict) {
    out.push({
      id: 'missing-context',
      type: 'improvement',
      shortLabel: 'Add context',
      explanation: 'Adding context (what you tried, the goal, constraints) sharply improves quality.',
      suggestion: 'Add a Context section: "Context: I run a 5-person agency and want to email past clients."',
      appliesTo: ['chat', 'system', 'both'],
    });
  }
  return out;
}

export function applyFix(originalText: string, issue: FeedbackIssue): string {
  // For missing-structure issues, prepend a guided line.
  if (issue.ruleId.startsWith('missing-')) {
    let prefix = '';
    if (issue.ruleId === 'missing-role') prefix = 'You are a senior expert in this domain.\n';
    else if (issue.ruleId === 'missing-format') prefix = 'Respond as a numbered list, under 200 words.\n';
    else if (issue.ruleId === 'missing-audience') prefix = 'The audience is a non-technical founder.\n';
    else if (issue.ruleId === 'missing-context') prefix = 'Context: [describe the situation, what you\'ve tried, and the goal].\n';
    return prefix + originalText;
  }

  // For vague matches, replace with a more concrete placeholder.
  const replacement = vagueReplacement(issue);
  if (replacement == null) return originalText;
  const before = originalText.slice(0, issue.startIndex);
  const after = originalText.slice(issue.endIndex);
  return before + replacement + after;
}

function vagueReplacement(issue: FeedbackIssue): string | null {
  const map: Record<string, string> = {
    good: '[specific quality, e.g., "concise and persuasive"]',
    nice: '[specific quality]',
    great: '[specific quality]',
    cool: '[specific quality]',
    awesome: '[specific quality]',
    amazing: '[specific quality]',
    stuff: '[specific items]',
    things: '[specific items]',
    something: '[specific item]',
    short: 'under 150 words',
    long: 'around 500 words',
    brief: 'under 100 words',
    lengthy: 'around 800 words',
    asap: '',
    quickly: '',
    fast: '',
    soon: '',
    'help me': 'I want you to',
    'can you help': 'I want you to',
    etc: '',
    'etc.': '',
    'and so on': '',
  };
  const key = issue.matchedText.toLowerCase();
  if (key in map) return map[key];
  return null;
}

export function generateChatReply(userMessage: string, promptContext: string): string {
  const msg = userMessage.toLowerCase().trim();
  const hasPrompt = promptContext.trim().length > 0;

  if (/example|sample|show me/.test(msg)) {
    return [
      'Here is a concrete example you can adapt:',
      '',
      'You are a senior B2B copywriter.',
      'Audience: non-technical founders running 5–20 person startups.',
      'Task: Rewrite the following landing page hero to emphasize outcomes, not features.',
      'Format: Return exactly 3 alternatives, each under 25 words, in a numbered list.',
      'Constraint: Avoid buzzwords like "synergy" and "revolutionary".',
    ].join('\n');
  }

  if (/role|persona/.test(msg)) {
    return 'A role anchors the model\'s tone, vocabulary, and depth. "You are a senior data engineer" produces very different output than no role at all. Add one sentence at the top of your prompt.';
  }

  if (/format|output|structure/.test(msg)) {
    return 'Specify format explicitly: list vs. paragraphs, length, sections, JSON schema, etc. Example: "Return a markdown table with columns: Name, Tradeoff, Recommended Use."';
  }

  if (/improve|better|fix/.test(msg)) {
    if (!hasPrompt) return 'Paste a draft in the editor and I\'ll highlight what to tighten. For now, the highest-leverage moves are: add a role, specify the output format, and replace vague words with concrete criteria.';
    return 'Looking at your prompt, the highest-leverage moves are usually: (1) set an explicit role, (2) describe the audience, (3) specify output format and length, (4) replace vague words like "good" or "short" with measurable criteria.';
  }

  if (/why|reason/.test(msg)) {
    return 'Language models infer intent from surface cues. Vague words force them to guess; concrete constraints let them optimize. Treat the prompt like a brief for a contractor — the more specific, the better the deliverable.';
  }

  if (/hi|hello|hey/.test(msg)) {
    return 'Hi! Paste a prompt in the editor and I\'ll highlight what is vague or missing. You can also ask me "give me an example" or "how do I improve this?".';
  }

  return 'Good question. Try being specific about: (1) who the model should be, (2) who the output is for, (3) the exact format and length, and (4) any constraints to avoid. Want me to show an example?';
}
