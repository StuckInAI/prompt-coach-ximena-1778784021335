import type { FeedbackIssue, IssueType } from '@/types';

export interface FeedbackRule {
  id: string;
  type: IssueType;
  shortLabel: string;
  detect: (text: string) => { start: number; end: number } | null;
  explanation: string;
  suggestion: string;
}

function findPhrase(text: string, phrase: string): { start: number; end: number } | null {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(phrase.toLowerCase());
  if (idx === -1) return null;
  return { start: idx, end: idx + phrase.length };
}

function findPattern(text: string, pattern: RegExp): { start: number; end: number } | null {
  const m = pattern.exec(text);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length };
}

const rules: FeedbackRule[] = [
  {
    id: 'vague-thing',
    type: 'vague',
    shortLabel: 'Vague subject',
    detect: (t) => findPattern(t, /\b(thing|stuff|it|this|that)\b/i),
    explanation: 'Using generic words like "thing" or "stuff" makes your prompt ambiguous. Specify exactly what you mean.',
    suggestion: 'Replace with a concrete noun (e.g., "the API response", "the report", "the dataset").',
  },
  {
    id: 'missing-role',
    type: 'missing',
    shortLabel: 'No role specified',
    detect: (t) => {
      const hasRole = /\b(you are|act as|as a|role:|persona:)\b/i.test(t);
      if (hasRole) return null;
      if (t.length < 30) return null;
      return { start: 0, end: Math.min(20, t.length) };
    },
    explanation: 'Assigning a role (e.g., "You are an expert copywriter") anchors the model behaviour and tone.',
    suggestion: 'Add a role at the beginning: "You are a [role]. [rest of prompt]"',
  },
  {
    id: 'missing-format',
    type: 'improvement',
    shortLabel: 'No output format',
    detect: (t) => {
      const hasFormat = /\b(json|markdown|bullet|list|table|format|structure|output|respond in|write in)\b/i.test(t);
      if (hasFormat) return null;
      if (t.length < 60) return null;
      const last = t.slice(-40);
      return { start: t.length - last.length, end: t.length };
    },
    explanation: 'Without an output format, the model may produce an inconsistent structure.',
    suggestion: 'Specify the format: "Respond in JSON", "Use a numbered list", or "Write in Markdown with headers".',
  },
  {
    id: 'vague-audience',
    type: 'vague',
    shortLabel: 'Vague audience',
    detect: (t) => findPattern(t, /\b(audience|reader|user|people|someone|they)\b/i),
    explanation: '"Audience" or "people" is too vague. Define who will read or use the output.',
    suggestion: 'Be specific: "senior software engineers", "non-technical stakeholders", "B2B SaaS founders".',
  },
  {
    id: 'missing-context',
    type: 'missing',
    shortLabel: 'No context provided',
    detect: (t) => {
      if (t.length > 120) return null;
      if (t.length < 20) return null;
      const hasContext = /\b(context|background|given|based on|our|we|company|product)\b/i.test(t);
      if (hasContext) return null;
      return { start: 0, end: Math.min(t.length, 40) };
    },
    explanation: 'Short prompts often lack context. What is the situation, product, or data the model should know about?',
    suggestion: 'Add a context sentence: "We are a [type] company that [does X]. Given [context], ..."',
  },
  {
    id: 'vague-length',
    type: 'improvement',
    shortLabel: 'No length constraint',
    detect: (t) => {
      if (t.length < 80) return null;
      const hasLength = /\b(\d+\s*(word|sentence|paragraph|line|char)|brief|concise|short|long|detailed|comprehensive)\b/i.test(t);
      if (hasLength) return null;
      return findPattern(t, /\b(write|generate|create|produce|draft)\b/i);
    },
    explanation: 'Without a length constraint, outputs vary wildly in size.',
    suggestion: 'Add a length: "in 2-3 sentences", "under 200 words", or "a comprehensive 5-paragraph essay".',
  },
  {
    id: 'vague-verb',
    type: 'vague',
    shortLabel: 'Weak action verb',
    detect: (t) => findPattern(t, /^(help|do|make|handle|deal with|work on|look at|check)/i),
    explanation: 'Starting with a weak verb like "help" or "do" gives the model little direction.',
    suggestion: 'Use a precise verb: "Summarize", "Classify", "Compare", "Rewrite", "Extract", "Explain".',
  },
  {
    id: 'missing-tone',
    type: 'improvement',
    shortLabel: 'No tone specified',
    detect: (t) => {
      if (t.length < 100) return null;
      const hasTone = /\b(tone|formal|informal|professional|friendly|casual|technical|simple|academic|persuasive|neutral)\b/i.test(t);
      if (hasTone) return null;
      return findPhrase(t, t.split(' ').slice(0, 5).join(' '));
    },
    explanation: 'Without a specified tone, the model defaults to a generic style that may not match your needs.',
    suggestion: 'Add tone guidance: "Use a professional tone", "Write conversationally", or "Keep it technical".',
  },
];

export function analyzePrompt(text: string, sensitivity: 'standard' | 'strict' = 'standard'): FeedbackIssue[] {
  if (!text.trim()) return [];
  const issues: FeedbackIssue[] = [];
  const used = new Set<string>();

  for (const rule of rules) {
    const match = rule.detect(text);
    if (!match) continue;

    // Avoid duplicate overlapping highlights
    const key = `${match.start}-${match.end}`;
    if (used.has(key)) continue;
    used.add(key);

    // In standard mode skip minor improvement hints for short prompts
    if (sensitivity === 'standard' && rule.type === 'improvement' && text.length < 50) continue;

    issues.push({
      id: `${rule.id}-${match.start}`,
      type: rule.type,
      shortLabel: rule.shortLabel,
      explanation: rule.explanation,
      suggestion: rule.suggestion,
      startIndex: match.start,
      endIndex: match.end,
    });
  }

  return issues;
}

// ── Chat reply generator ──────────────────────────────────────────────────────
const chatReplies: Array<{ match: (q: string) => boolean; reply: () => string }> = [
  {
    match: (q) => /role|persona|act as/i.test(q),
    reply: () =>
      'Roles anchor the model behaviour. Try starting with "You are an expert [X] with [Y] years of experience in [Z]." This dramatically narrows the response style.',
  },
  {
    match: (q) => /format|json|markdown|structure/i.test(q),
    reply: () =>
      'Output format tips:\n\u2022 "Respond in JSON with keys: title, summary, tags"\n\u2022 "Use a numbered list"\n\u2022 "Write in Markdown with headers"',
  },
  {
    match: (q) => /vague|specific|clear/i.test(q),
    reply: () =>
      'Vagueness is the #1 prompt problem. Replace generic nouns ("thing", "it", "stuff") with precise terms. Specify the audience, scope, and desired depth.',
  },
  {
    match: (q) => /context|background/i.test(q),
    reply: () =>
      'Context frames everything. Add a sentence like: "We are a B2B SaaS startup. Our users are CTOs of mid-size companies." The more relevant background, the better the output.',
  },
  {
    match: (q) => /length|word|sentence|short|long/i.test(q),
    reply: () =>
      'Length constraints prevent bloat or underdelivery. Use: "in exactly 3 bullet points", "under 150 words", or "a 5-paragraph structured essay".',
  },
];

const fallbackReplies = [
  'Great question! The key to a strong prompt is specificity: role, context, format, and length. Try adding one of those to your current prompt.',
  'Think of your prompt as a brief to a contractor. The more precisely you describe the output, the closer the first draft will be to what you need.',
  'One quick win: add an output format instruction at the end of your prompt. Even "Respond as a numbered list" dramatically improves usability.',
  'Try the RCTF framework: Role, Context, Task, Format. Cover all four and your prompts will be consistently strong.',
];

export function generateChatReply(userMessage: string, _promptContext: string): string {
  for (const handler of chatReplies) {
    if (handler.match(userMessage)) return handler.reply();
  }
  return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
}
