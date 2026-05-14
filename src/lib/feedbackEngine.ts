import type { FeedbackIssue, IssueType, Preferences, UseCase } from '@/types';
import { uid } from '@/lib/id';

type Rule = {
  id: string;
  type: IssueType;
  shortLabel: string;
  explanation: string;
  suggestion: string;
  // Either a regex to highlight a phrase, or a presence check (entire prompt)
  pattern?: RegExp;
  // If pattern is omitted, this is a "missing" rule: highlight first N chars if the check fails
  missingIf?: (text: string) => boolean;
  appliesTo?: UseCase[];
};

const RULES: Rule[] = [
  {
    id: 'vague-something',
    type: 'vague',
    shortLabel: 'Vague phrasing',
    explanation: 'Words like "something", "stuff", or "things" leave too much room for interpretation.',
    suggestion: 'Replace with a concrete noun (e.g. "a 3-paragraph launch email" instead of "something for launch").',
    pattern: /\b(something|stuff|things|some kind of)\b/gi,
  },
  {
    id: 'vague-nice',
    type: 'vague',
    shortLabel: 'Subjective quality',
    explanation: '"Nice", "good", or "better" are subjective. Specify what good looks like.',
    suggestion: 'Define criteria, e.g. "persuasive, under 120 words, in a confident tone".',
    pattern: /\b(nice|good|better|cool|awesome)\b/gi,
  },
  {
    id: 'vague-help',
    type: 'vague',
    shortLabel: 'Unclear ask',
    explanation: '"Help me with" doesn\'t specify the action. Tell the model what to produce.',
    suggestion: 'Use a verb + artifact, e.g. "Write a 5-step plan" or "Draft 3 subject lines".',
    pattern: /\b(help me (?:with|to)?)\b/gi,
  },
  {
    id: 'vague-asap',
    type: 'vague',
    shortLabel: 'Imprecise constraint',
    explanation: '"ASAP", "a lot", or "some" are not measurable.',
    suggestion: 'Use specific numbers or limits, e.g. "under 200 words" or "exactly 5 items".',
    pattern: /\b(asap|a lot|some|a few|many)\b/gi,
  },
  {
    id: 'improvement-please',
    type: 'improvement',
    shortLabel: 'Filler word',
    explanation: 'Politeness fillers like "please" or "kindly" add noise without information.',
    suggestion: 'Drop the filler and lead with the instruction.',
    pattern: /\b(please|kindly)\b/gi,
  },
  {
    id: 'improvement-maybe',
    type: 'improvement',
    shortLabel: 'Hedging language',
    explanation: 'Hedges like "maybe" or "if possible" weaken the instruction.',
    suggestion: 'State the requirement directly.',
    pattern: /\b(maybe|if possible|sort of|kind of)\b/gi,
  },
  {
    id: 'missing-role',
    type: 'missing',
    shortLabel: 'No role specified',
    explanation: 'Assigning a role ("You are a…") anchors the model\'s tone and expertise.',
    suggestion: 'Add a role line: "You are a senior product marketer."',
    missingIf: (t) => !/(you are|act as|you'?re a|as an? (?:expert|senior))/i.test(t),
    appliesTo: ['system-prompt', 'both'],
  },
  {
    id: 'missing-format',
    type: 'missing',
    shortLabel: 'No output format',
    explanation: 'Without an output format, you may get prose when you wanted a list, table, or JSON.',
    suggestion: 'Add a format instruction, e.g. "Respond as a bulleted list" or "Return JSON with keys: title, body".',
    missingIf: (t) => !/(bullet|list|table|json|markdown|paragraph|under \d+|\d+ (?:words|items|steps|sentences))/i.test(t),
  },
  {
    id: 'missing-audience',
    type: 'missing',
    shortLabel: 'No audience',
    explanation: 'The reader changes everything. A pitch to engineers reads differently than to investors.',
    suggestion: 'Add a target audience: "for a non-technical founder" or "for a senior backend engineer".',
    missingIf: (t) => !/(audience|reader|for (?:a |an )?(?:beginner|engineer|founder|student|customer|user|child|expert))/i.test(t),
  },
  {
    id: 'missing-context',
    type: 'missing',
    shortLabel: 'Lacks context',
    explanation: 'Short prompts under ~15 words usually lack enough context for a strong answer.',
    suggestion: 'Add background: who you are, what you\'ve tried, and what success looks like.',
    missingIf: (t) => t.trim().split(/\s+/).filter(Boolean).length < 15 && t.trim().length > 0,
  },
];

export function analyzePrompt(text: string, prefs: Preferences): FeedbackIssue[] {
  if (!text.trim()) return [];
  const issues: FeedbackIssue[] = [];
  const seenPatterns = new Set<string>();

  const useCase = prefs.useCase;
  const sensitivity = prefs.sensitivity;

  for (const rule of RULES) {
    if (rule.appliesTo && useCase !== 'both' && !rule.appliesTo.includes(useCase)) {
      continue;
    }
    if (sensitivity === 'gentle' && rule.type === 'improvement') {
      continue; // skip nitpicks on gentle
    }

    if (rule.pattern) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        issues.push({
          id: uid('iss'),
          ruleId: rule.id,
          type: rule.type,
          shortLabel: rule.shortLabel,
          explanation: rule.explanation,
          suggestion: rule.suggestion,
          startIndex: start,
          endIndex: end,
          matchedText: m[0],
        });
        if (m[0].length === 0) regex.lastIndex++;
      }
    } else if (rule.missingIf && rule.missingIf(text)) {
      const key = 'missing:' + rule.id;
      if (seenPatterns.has(key)) continue;
      seenPatterns.add(key);
      // Highlight first sentence or first 60 chars
      const firstBreak = text.search(/[.!?\n]/);
      const end = firstBreak > 0 ? firstBreak + 1 : Math.min(60, text.length);
      issues.push({
        id: uid('iss'),
        ruleId: rule.id,
        type: rule.type,
        shortLabel: rule.shortLabel,
        explanation: rule.explanation,
        suggestion: rule.suggestion,
        startIndex: 0,
        endIndex: end,
        matchedText: text.slice(0, end),
      });
    }
  }

  if (sensitivity === 'strict') {
    // No filtering, return all
    return issues;
  }
  if (sensitivity === 'gentle') {
    return issues.filter((i) => i.type !== 'improvement').slice(0, 4);
  }
  // standard: cap to 8
  return issues.slice(0, 8);
}

export function applyFix(text: string, issue: FeedbackIssue): string {
  // For pattern-based issues, replace the matched range with a clearer placeholder derived from suggestion.
  // For missing-* issues, prepend a templated line.
  if (issue.ruleId.startsWith('missing-')) {
    let prefix = '';
    if (issue.ruleId === 'missing-role') prefix = 'You are a senior expert in this domain.\n';
    else if (issue.ruleId === 'missing-format') prefix = 'Respond as a numbered list, under 200 words.\n';
    else if (issue.ruleId === 'missing-audience') prefix = 'The audience is a non-technical founder.\n';
    else if (issue.ruleId === 'missing-context') prefix = 'Context: [describe the situation, what you\'ve tried, and the goal].\n';
    return prefix + text;
  }
  // Replacement map for common vague terms
  const replacements: Record<string, string> = {
    something: 'a specific deliverable',
    stuff: 'specific items',
    things: 'specific items',
    nice: 'clear and persuasive',
    good: 'high-quality',
    better: 'more specific',
    cool: 'engaging',
    awesome: 'compelling',
    'help me with': 'Write',
    'help me to': 'Write',
    'help me': 'Write',
    asap: 'within today',
    'a lot': 'at least 5',
    'a few': '3',
    some: '3',
    many: '5+',
    please: '',
    kindly: '',
    maybe: '',
    'if possible': '',
    'sort of': '',
    'kind of': '',
  };
  const key = issue.matchedText.toLowerCase();
  const replacement = replacements[key] ?? '';
  const before = text.slice(0, issue.startIndex);
  const after = text.slice(issue.endIndex);
  let merged = before + replacement + after;
  // collapse leftover double spaces from empty replacements
  merged = merged.replace(/ {2,}/g, ' ').replace(/ ,/g, ',').replace(/^\s+/, '');
  return merged;
}

export function generateChatReply(userMessage: string, promptContext: string): string {
  const msg = userMessage.toLowerCase();
  const hasPrompt = promptContext.trim().length > 0;

  if (/example|sample|show me/.test(msg)) {
    return [
      'Here is a stronger example you can adapt:',
      '',
      '"You are a senior product marketer. Write a 5-bullet launch announcement for our new analytics dashboard. Audience: non-technical founders. Tone: confident, no hype. Limit each bullet to 18 words."',
      '',
      'Notice the role, format, audience, tone, and a hard limit — those are the four levers that move quality the most.',
    ].join('\n');
  }

  if (/role|persona|you are/.test(msg)) {
    return 'Assigning a role anchors the model\'s vocabulary and assumptions. "You are a senior X" is usually enough — adding 1–2 traits (e.g. "skeptical, concise") sharpens it further.';
  }

  if (/format|structure|output/.test(msg)) {
    return 'Always specify the shape of the answer. Options: a numbered list, a markdown table, JSON with named keys, or "a single paragraph under 80 words". Without a format, you get whatever the model defaults to.';
  }

  if (/improve|better|fix|stronger/.test(msg)) {
    if (!hasPrompt) {
      return 'Paste a draft into the editor and I\'ll point out vague phrasing, missing context, and improvements you can apply with one click.';
    }
    return [
      'Three quick levers to improve almost any prompt:',
      '1. Add a role line ("You are a…")',
      '2. State the output format and a length limit',
      '3. Replace any vague word ("something", "nice") with a concrete noun or measurable criterion',
    ].join('\n');
  }

  if (/why|reason|matter/.test(msg)) {
    return 'Language models extrapolate from what you give them. The more specific the constraints (role, audience, format, length), the smaller the space of plausible answers — and the higher the average quality.';
  }

  if (/hi|hello|hey/.test(msg.trim())) {
    return 'Hi! Paste a draft prompt in the editor and ask me anything — "how can I improve this?", "give me an example", or "why does format matter?".';
  }

  if (!hasPrompt) {
    return 'Tip: write a draft in the editor on the left. I\'ll highlight specific phrases and you can hover them or ask me to expand on any feedback here.';
  }

  return 'Good question. A useful pattern: Role → Task → Context → Format → Constraints. If any of those are missing in your draft, adding them usually beats clever wording.';
}
