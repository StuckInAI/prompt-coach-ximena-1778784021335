export type IssueType = 'vague' | 'missing' | 'improvement';

export interface FeedbackIssue {
  id: string;
  startIndex: number;
  endIndex: number;
  type: IssueType;
  shortLabel: string;
  explanation: string;
  suggestion: string;
}

interface Rule {
  pattern: RegExp;
  type: IssueType;
  shortLabel: string;
  explanation: (match: string) => string;
  suggestion: (match: string) => string;
}

const RULES: Rule[] = [
  {
    pattern: /\b(something|stuff|things|whatever|anything)\b/gi,
    type: 'vague',
    shortLabel: 'Vague noun',
    explanation: (m) => `"${m}" is too vague for an AI to act on. Specify exactly what you mean.`,
    suggestion: (m) => `Replace "${m}" with a concrete noun or phrase.`,
  },
  {
    pattern: /\b(good|nice|great|awesome|amazing|bad|cool)\b/gi,
    type: 'vague',
    shortLabel: 'Vague adjective',
    explanation: (m) => `"${m}" is subjective — the AI won't know your standard. Use specific criteria.`,
    suggestion: (m) => `Replace "${m}" with a measurable quality, e.g. "concise", "professional", "under 100 words".`,
  },
  {
    pattern: /\b(write|create|make|build|generate)\b(?!.*\b(tone|format|length|audience|style|goal)\b)/gi,
    type: 'missing',
    shortLabel: 'Missing context',
    explanation: () => 'This action verb appears without specifying tone, format, length, or audience. AI needs these details.',
    suggestion: () => 'Add: target audience, desired tone, output format, and approximate length.',
  },
  {
    pattern: /\b(short|long|brief|detailed|quick)\b/gi,
    type: 'improvement',
    shortLabel: 'Imprecise length',
    explanation: (m) => `"${m}" is relative. Specify an exact word count or number of sentences.`,
    suggestion: (m) => `Replace "${m}" with e.g. "under 100 words" or "3 bullet points".`,
  },
  {
    pattern: /\b(my audience|my users|my customers|our users|our customers)\b/gi,
    type: 'improvement',
    shortLabel: 'Undefined audience',
    explanation: () => 'The audience is referenced but not described. Who are they exactly?',
    suggestion: () => 'Add a brief description: e.g. "busy startup founders with no technical background".',
  },
  {
    pattern: /\b(asap|soon|quickly|fast)\b/gi,
    type: 'vague',
    shortLabel: 'Vague urgency',
    explanation: (m) => `"${m}" is not actionable for an AI. Remove or replace with a concrete constraint.`,
    suggestion: () => 'Remove or clarify the time constraint — it has no meaning for an AI model.',
  },
  {
    pattern: /^(?!.*\b(tone|voice|style)\b).{80,}$/gim,
    type: 'improvement',
    shortLabel: 'No tone specified',
    explanation: () => 'Longer prompts often benefit from explicitly stating the desired tone or voice.',
    suggestion: () => 'Add a tone directive, e.g. "Use a professional, conversational tone."',
  },
];

export function analyzeFeedback(text: string, sensitivity: 'standard' | 'strict' = 'standard'): FeedbackIssue[] {
  const issues: FeedbackIssue[] = [];
  const seenRanges: [number, number][] = [];

  for (const rule of RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      // Skip overlapping ranges
      if (seenRanges.some(([s, e]) => start < e && end > s)) continue;
      // In standard mode skip the "no tone" rule for short texts
      if (sensitivity === 'standard' && rule.shortLabel === 'No tone specified' && text.length < 120) continue;
      seenRanges.push([start, end]);
      issues.push({
        id: `issue-${start}-${end}-${rule.type}`,
        startIndex: start,
        endIndex: end,
        type: rule.type,
        shortLabel: rule.shortLabel,
        explanation: rule.explanation(match[0]),
        suggestion: rule.suggestion(match[0]),
      });
      if (issues.length >= 8) break;
    }
    if (issues.length >= 8) break;
  }

  return issues.sort((a, b) => a.startIndex - b.startIndex);
}
