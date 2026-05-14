import type { FeedbackIssue, IssueType, Sensitivity, UseCase } from '@/types';
import { uid } from './id';

// Heuristic, fully client-side prompt analyzer that mimics what an LLM-backed
// feedback API would return. This stands in for a server-side OpenAI call.

type Rule = {
  pattern: RegExp;
  type: IssueType;
  shortLabel: string;
  explanation: string;
  suggestion: string;
  minSensitivity?: Sensitivity;
};

const VAGUE_RULES: Rule[] = [
  {
    pattern: /\b(some|several|a few|a lot|many|various)\b/gi,
    type: 'vague',
    shortLabel: 'Vague quantity',
    explanation: 'Words like "some" or "a few" leave the model guessing how many you actually want.',
    suggestion: 'Specify an exact number (e.g. "exactly 5" or "between 3 and 7").',
  },
  {
    pattern: /\b(stuff|things|something|anything)\b/gi,
    type: 'vague',
    shortLabel: 'Vague noun',
    explanation: 'Generic nouns like "things" or "stuff" do not tell the model what kind of output you want.',
    suggestion: 'Replace with a concrete noun describing the exact item (e.g. "customer pain points").',
  },
  {
    pattern: /\b(good|nice|great|cool|awesome|interesting)\b/gi,
    type: 'vague',
    shortLabel: 'Subjective adjective',
    explanation: 'Words like "good" or "nice" are subjective — the model has no measurable target.',
    suggestion: 'Use a measurable quality (e.g. "converts at >3%", "under 280 characters", "in plain English").',
  },
  {
    pattern: /\b(quickly|soon|asap|fast|short)\b/gi,
    type: 'vague',
    shortLabel: 'Imprecise scope',
    explanation: 'Time/length words like "short" or "quickly" are not precise.',
    suggestion: 'Give an exact length or limit (e.g. "max 100 words" or "3 bullet points").',
    minSensitivity: 'strict',
  },
];

const IMPROVEMENT_RULES: Rule[] = [
  {
    pattern: /\b(please|kindly)\b/gi,
    type: 'improvement',
    shortLabel: 'Filler word',
    explanation: 'Politeness words add no signal for the model and waste tokens.',
    suggestion: 'Remove "please" / "kindly" — be direct and instruction-like.',
    minSensitivity: 'strict',
  },
  {
    pattern: /\b(maybe|perhaps|might|could)\b/gi,
    type: 'improvement',
    shortLabel: 'Hedging language',
    explanation: 'Hedging makes your instruction sound optional. The model may not follow it.',
    suggestion: 'Use direct verbs: "Write…", "List…", "Generate…".',
  },
];

export function analyzePrompt(text: string, useCase: UseCase, sensitivity: Sensitivity): FeedbackIssue[] {
  const issues: FeedbackIssue[] = [];
  if (!text.trim()) return issues;

  const allRules: Rule[] = [...VAGUE_RULES, ...IMPROVEMENT_RULES];

  for (const rule of allRules) {
    if (rule.minSensitivity === 'strict' && sensitivity !== 'strict') continue;
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      issues.push({
        id: uid('iss'),
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        type: rule.type,
        shortLabel: rule.shortLabel,
        explanation: rule.explanation,
        suggestion: rule.suggestion,
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  // "Missing" issues operate at the document level — we attach them to the
  // first relevant span so they still render inline.
  const lower = text.toLowerCase();

  const hasRoleContext = /(you are|act as|role:)/i.test(text);
  if (!hasRoleContext && text.length > 30) {
    issues.push(missingIssue(text, 0, Math.min(40, text.length), {
      label: 'Missing role / persona',
      explanation: 'You have not told the model who it should be. Setting a role dramatically improves output quality.',
      suggestion: useCase === 'system-prompt'
        ? 'Start with: "You are a [role] with expertise in [domain]."'
        : 'Add a line like: "Act as a senior copywriter specializing in B2B SaaS."',
    }));
  }

  const hasFormat = /(format|json|bullet|list|table|markdown|step)/i.test(lower);
  if (!hasFormat && text.length > 30) {
    issues.push(missingIssue(text, Math.max(0, text.length - 40), text.length, {
      label: 'Missing output format',
      explanation: 'You have not specified how the response should be structured. The model will guess.',
      suggestion: 'Add a format spec, e.g. "Return as a JSON array of objects with fields: title, body."',
    }));
  }

  const hasAudience = /(audience|for [a-z]+ users|target|reader)/i.test(lower);
  if (!hasAudience && sensitivity === 'strict' && text.length > 30) {
    issues.push(missingIssue(text, 0, Math.min(30, text.length), {
      label: 'Missing audience',
      explanation: 'Without an audience, tone and complexity are unpredictable.',
      suggestion: 'Specify the reader, e.g. "for non-technical founders" or "for senior backend engineers".',
    }));
  }

  // De-duplicate overlapping ranges with same type/label
  const seen = new Set<string>();
  const deduped: FeedbackIssue[] = [];
  for (const i of issues.sort((a, b) => a.startIndex - b.startIndex)) {
    const key = `${i.type}:${i.shortLabel}:${i.startIndex}:${i.endIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(i);
  }
  return deduped;
}

function missingIssue(
  text: string,
  start: number,
  end: number,
  meta: { label: string; explanation: string; suggestion: string }
): FeedbackIssue {
  // Snap to word boundaries
  let s = start;
  let e = end;
  while (s > 0 && /\S/.test(text[s - 1])) s--;
  while (e < text.length && /\S/.test(text[e])) e++;
  return {
    id: uid('iss'),
    startIndex: s,
    endIndex: Math.max(e, s + 1),
    type: 'missing',
    shortLabel: meta.label,
    explanation: meta.explanation,
    suggestion: meta.suggestion,
  };
}

// Conversational chat response — a heuristic simulation of GPT-4o chat help.
export function generateChatReply(userMessage: string, promptContext: string): string {
  const msg = userMessage.toLowerCase().trim();
  const hasPrompt = promptContext.trim().length > 0;

  if (/improve|better|fix/.test(msg)) {
    return hasPrompt
      ? `Here are three concrete ways to strengthen your prompt:\n\n1. Open with a clear role: "You are a [role] with expertise in [domain]."\n2. Specify the exact output format (JSON / bullet list / markdown).\n3. Replace vague words ("some", "good", "things") with measurable criteria.\n\nApply those three and your prompt will produce noticeably more consistent results.`
      : 'Paste a prompt into the editor on the left and I can give you targeted suggestions.';
  }
  if (/example|sample|show me/.test(msg)) {
    return 'Example of a well-structured prompt:\n\n```\nYou are a senior B2B copywriter.\nTask: Write 3 cold-email subject lines for a SaaS product that helps founders write better AI prompts.\nAudience: Non-technical startup founders.\nFormat: Return as a JSON array of strings, max 60 chars each.\nTone: Curious, no clickbait.\n```\n\nNotice it includes role, task, audience, format, and tone.';
  }
  if (/why|explain/.test(msg)) {
    return 'LLMs are pattern-matchers. The more specific your instructions, the narrower the space of acceptable outputs — which means more consistent, on-target answers. Vague prompts force the model to guess, and guesses regress to the mean.';
  }
  if (/role|persona/.test(msg)) {
    return 'A role line sets the model\'s expertise and tone in a single sentence. Try: "You are a [job title] with [N years] of experience in [domain]. You write in a [tone] style."';
  }
  if (/format/.test(msg)) {
    return 'Always specify the output format. Useful options:\n• JSON with named fields (best for structured data)\n• Numbered list (best for step-by-step)\n• Markdown table (best for comparisons)\n• Plain prose, max N words (best for content)';
  }
  return hasPrompt
    ? `I can see your current prompt (${promptContext.length} chars). Ask me to: "improve this", "give an example", "explain why X matters", or "add a role line".`
    : 'Hi! I\'m your prompt coach. Start typing a prompt in the editor and ask me anything about how to make it sharper.';
}
