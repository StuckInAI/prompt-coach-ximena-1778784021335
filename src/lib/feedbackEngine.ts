import type { FeedbackIssue } from '@/types';
import { nanoid } from '@/lib/id';

// ── Feedback analysis ────────────────────────────────────────────────────────

const VAGUE_PATTERNS: { re: RegExp; label: string; explanation: string; suggestion: string }[] = [
  {
    re: /\b(stuff|things|something|anything|whatever|somehow|somewhere|etc)\b/gi,
    label: 'Vague term',
    explanation: 'This word is too ambiguous. Be specific about what you mean.',
    suggestion: 'Replace with a concrete noun or description.',
  },
  {
    re: /\b(good|bad|nice|great|awesome|cool|interesting|important)\b/gi,
    label: 'Weak adjective',
    explanation: 'Subjective adjectives add little signal. Use measurable or descriptive language.',
    suggestion: 'Specify what quality you actually want (e.g. "concise", "data-driven", "under 100 words").',
  },
  {
    re: /\b(a lot|many|some|few|several|various|numerous)\b/gi,
    label: 'Vague quantity',
    explanation: 'Quantify exactly what you need for a more precise result.',
    suggestion: 'Use a specific number or range (e.g. "3 examples", "fewer than 5 bullets").',
  },
];

const MISSING_PATTERNS: { re: RegExp; label: string; explanation: string; suggestion: string }[] = [
  {
    re: /\b(asap|urgently|quickly|fast|soon)\b/gi,
    label: 'Missing deadline',
    explanation: 'Time references without context are hard to interpret.',
    suggestion: 'State the actual deadline or time constraint.',
  },
];

const IMPROVEMENT_PATTERNS: { re: RegExp; label: string; explanation: string; suggestion: string }[] = [
  {
    re: /\b(write|create|make|generate|produce|give me|provide)\b/gi,
    label: 'Add output format',
    explanation: 'Specifying the output format helps the model structure its response.',
    suggestion: 'Add "in a numbered list", "as a JSON object", or "in Markdown" to your request.',
  },
  {
    re: /\b(user|reader|audience|customer|client|people)\b/gi,
    label: 'Specify audience',
    explanation: 'Naming the exact audience helps calibrate tone and complexity.',
    suggestion: 'Describe the audience more precisely (e.g. "senior software engineers", "first-time home buyers").',
  },
];

export function analyzeFeedback(text: string): FeedbackIssue[] {
  const issues: FeedbackIssue[] = [];
  const used = new Set<number>(); // track used character positions to avoid overlaps

  const tryAdd = (
    type: FeedbackIssue['type'],
    match: RegExpExecArray,
    label: string,
    explanation: string,
    suggestion: string
  ) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    for (let i = start; i < end; i++) {
      if (used.has(i)) return;
    }
    for (let i = start; i < end; i++) used.add(i);
    issues.push({
      id: nanoid(),
      type,
      shortLabel: label,
      explanation,
      suggestion,
      startIndex: start,
      endIndex: end,
    });
  };

  for (const p of VAGUE_PATTERNS) {
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(text)) !== null) {
      tryAdd('vague', m, p.label, p.explanation, p.suggestion);
    }
  }
  for (const p of MISSING_PATTERNS) {
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(text)) !== null) {
      tryAdd('missing', m, p.label, p.explanation, p.suggestion);
    }
  }
  for (const p of IMPROVEMENT_PATTERNS) {
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(text)) !== null) {
      tryAdd('improvement', m, p.label, p.explanation, p.suggestion);
    }
  }

  return issues;
}

// ── Chat reply generator ──────────────────────────────────────────────────────

const CHAT_RULES: { re: RegExp; reply: (ctx: string) => string }[] = [
  {
    re: /improve|better|fix|enhance/i,
    reply: (ctx) =>
      ctx.length > 20
        ? `To improve this prompt, try adding:\n• A clear role ("You are a …")
• The desired output format
• Audience details\n\nYour current prompt: "${ctx.slice(0, 80)}…"`
        : 'Add a role, output format, and audience to make your prompt more effective.',
  },
  {
    re: /role|persona/i,
    reply: () =>
      'Assigning a role focuses the model. Try starting with "You are an expert [X]" before your actual request.',
  },
  {
    re: /example|sample|show me/i,
    reply: (ctx) =>
      ctx.length > 10
        ? `Here's a stronger version:\n\n"You are an expert copywriter. Write a 3-bullet summary of [${ctx.slice(0, 40)}] for a non-technical audience. Use plain English and avoid jargon."`
        : 'Try: "You are a [role]. [Task] for [audience]. Format: [bullets/JSON/paragraph]."',
  },
  {
    re: /format|structure|output/i,
    reply: () =>
      'Output format tips:\n• "Respond in JSON with keys: title, summary, tags"
• "Use a numbered list"
• "Write in Markdown with headers"',
  },
  {
    re: /vague|unclear|specific/i,
    reply: () =>
      'Replace vague words (stuff, things, good) with concrete terms. Instead of "write something good" try "write a 150-word product description with a CTA button label".',
  },
  {
    re: /missing|what else|lack/i,
    reply: () =>
      'Common missing elements:\n1. Role / persona\n2. Audience\n3. Tone\n4. Length constraint\n5. Output format',
  },
  {
    re: /tone|voice|style/i,
    reply: () =>
      'Tone keywords to add: professional, casual, empathetic, concise, technical, conversational, witty.',
  },
  {
    re: /length|word|short|long/i,
    reply: () =>
      'Add a length constraint: "under 100 words", "exactly 3 paragraphs", or "no more than 5 bullet points".',
  },
];

const FALLBACK_REPLIES = [
  'Great question! Share more about what you\'re trying to achieve and I\'ll give specific advice.',
  'Tip: the best prompts have a role, a task, an audience, and an output format.',
  'Try adding "Step-by-step, " at the start to get more structured responses from the model.',
  'Context is king. The more background you provide, the better the model performs.',
  'Consider adding constraints — length, tone, format — to narrow the output to exactly what you need.',
];

let fallbackIdx = 0;

export function generateChatReply(userMessage: string, promptContext: string): string {
  for (const rule of CHAT_RULES) {
    if (rule.re.test(userMessage)) {
      return rule.reply(promptContext);
    }
  }
  const reply = FALLBACK_REPLIES[fallbackIdx % FALLBACK_REPLIES.length];
  fallbackIdx++;
  return reply;
}
