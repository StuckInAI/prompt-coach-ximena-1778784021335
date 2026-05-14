import type { FeedbackIssue } from '@/types';
import type { IssueType } from '@/types';

export type { FeedbackIssue };

interface Rule {
  id: string;
  type: IssueType;
  pattern: RegExp;
  shortLabel: string;
  explanation: string;
  suggestion: (match: string) => string;
}

const RULES: Rule[] = [
  {
    id: 'vague-thing',
    type: 'vague',
    pattern: /\b(thing|stuff|something|anything|it|this|that)\b/gi,
    shortLabel: 'Vague reference',
    explanation: 'This word is too vague. Be specific about what you mean.',
    suggestion: (m) => `[specify what you mean instead of "${m}"]`,
  },
  {
    id: 'vague-good',
    type: 'vague',
    pattern: /\b(good|great|nice|better|best|awesome|amazing|excellent)\b/gi,
    shortLabel: 'Vague quality',
    explanation: 'Subjective quality words are vague. Define what "good" means in your context.',
    suggestion: (m) => `[define what "${m}" means, e.g. concise, engaging, data-driven]`,
  },
  {
    id: 'missing-format',
    type: 'missing',
    pattern: /\b(write|create|generate|make|produce|draft)\b/gi,
    shortLabel: 'No output format',
    explanation: 'You haven\'t specified the output format (e.g. bullet list, paragraph, JSON, table).',
    suggestion: () => 'Add: "Format the output as [bullet list / JSON / paragraph / table]."',
  },
  {
    id: 'missing-audience',
    type: 'missing',
    pattern: /\b(explain|describe|summarize|teach)\b/gi,
    shortLabel: 'No target audience',
    explanation: 'You haven\'t specified who this is for. Adding an audience improves relevance.',
    suggestion: () => 'Add: "Target audience: [beginners / experts / executives / etc.]"',
  },
  {
    id: 'improve-role',
    type: 'improvement',
    pattern: /^(write|create|generate|explain|describe|make|draft|summarize)/i,
    shortLabel: 'Add a role',
    explanation: 'Starting with a role ("Act as…") often improves output quality significantly.',
    suggestion: () => 'Prepend: "Act as a [expert role] and…"',
  },
  {
    id: 'vague-soon',
    type: 'vague',
    pattern: /\b(soon|quickly|fast|recently|a lot|many|some|few|several)\b/gi,
    shortLabel: 'Ambiguous quantity/time',
    explanation: 'This expression is ambiguous. Use concrete numbers or timeframes.',
    suggestion: (m) => `[replace "${m}" with a specific number or date]`,
  },
  {
    id: 'improve-tone',
    type: 'improvement',
    pattern: /\b(tone|voice|style)\b/gi,
    shortLabel: 'Specify tone',
    explanation: 'You mentioned tone but didn\'t define it. Specify: formal, casual, authoritative, friendly, etc.',
    suggestion: () => 'Specify: "Tone: [formal / casual / authoritative / friendly]"',
  },
];

export function analyzeFeedback(text: string): FeedbackIssue[] {
  if (!text.trim()) return [];
  const issues: FeedbackIssue[] = [];
  const usedRanges: Array<[number, number]> = [];

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = usedRanges.some(([s, e]) => start < e && end > s);
      if (overlaps) continue;
      usedRanges.push([start, end]);
      issues.push({
        id: `${rule.id}-${start}`,
        ruleId: rule.id,
        type: rule.type,
        shortLabel: rule.shortLabel,
        explanation: rule.explanation,
        suggestion: rule.suggestion(match[0]),
        matchedText: match[0],
        startIndex: start,
        endIndex: end,
      });
    }
  }

  return issues.sort((a, b) => a.startIndex - b.startIndex);
}

// ─── Improved Prompt Generator ───────────────────────────────────────────────

export function generateImprovedPrompt(originalPrompt: string, issues: FeedbackIssue[]): string {
  if (!originalPrompt.trim()) return '';

  let improved = originalPrompt.trim();

  // 1. Prepend a role if the prompt starts with an action verb and no role is set
  const hasRole = /^(act as|you are|as a|imagine you)/i.test(improved);
  if (!hasRole && /^(write|create|generate|explain|describe|make|draft|summarize)/i.test(improved)) {
    // Infer a sensible role from context
    let role = 'an expert';
    if (/\b(code|function|script|program|api|debug)\b/i.test(improved)) role = 'a senior software engineer';
    else if (/\b(blog|article|post|essay|content|copy)\b/i.test(improved)) role = 'a professional content writer';
    else if (/\b(email|message|letter|outreach)\b/i.test(improved)) role = 'an expert copywriter';
    else if (/\b(market|brand|campaign|ad|audience)\b/i.test(improved)) role = 'a senior marketing strategist';
    else if (/\b(data|analys|report|insight|metric)\b/i.test(improved)) role = 'a data analyst';
    improved = `Act as ${role}. ${improved}`;
  }

  // 2. Replace vague words inline
  const vagueMap: Record<string, string> = {
    thing: '[specific item]',
    stuff: '[specific material]',
    something: '[specific subject]',
    anything: '[specific topic]',
    good: '[high-quality and clearly defined]',
    great: '[outstanding by a specific metric]',
    nice: '[polished and professional]',
    better: '[improved in a measurable way]',
    best: '[optimized for the stated goal]',
    soon: '[within X days]',
    quickly: '[in under X minutes]',
    fast: '[within a defined timeframe]',
    recently: '[in the past X days]',
    'a lot': '[N items]',
    many: '[N]',
    some: '[specify quantity]',
    few: '[2–3]',
    several: '[4–6]',
  };
  for (const [word, replacement] of Object.entries(vagueMap)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    improved = improved.replace(regex, replacement);
  }

  // 3. Append missing structural pieces as a structured suffix
  const hasFormat = /\b(format|bullet|list|table|json|paragraph|numbered|structured)\b/i.test(improved);
  const hasAudience = /\b(audience|for|beginner|expert|executive|developer|founder|customer|reader|user)\b/i.test(improved);
  const hasTone = /\b(tone|formal|casual|professional|friendly|authoritative|conversational)\b/i.test(improved);
  const hasLength = /\b(\d+\s*word|\d+\s*sentence|\d+\s*paragraph|\d+\s*bullet|under|limit|brief|concise|short|long)\b/i.test(improved);

  const additions: string[] = [];
  if (!hasFormat) additions.push('Format: [bullet list / numbered steps / paragraph / table — choose one].');
  if (!hasAudience) additions.push('Audience: [describe who will read this output].');
  if (!hasTone) additions.push('Tone: [formal / casual / authoritative / friendly].');
  if (!hasLength) additions.push('Length: [e.g. 150 words / 5 bullet points / 3 paragraphs].');

  if (additions.length > 0) {
    improved += '\n\n' + additions.join('\n');
  }

  return improved;
}

// ─── Chat Reply Generator ─────────────────────────────────────────────────────

export function generateChatReply(userMessage: string, promptContext: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('improve') || msg.includes('better') || msg.includes('fix')) {
    return `Here are some ways to improve your prompt:\n\n1. **Add a role**: Start with "Act as a [expert]" to set context.\n2. **Specify format**: Tell the AI how to structure the output (list, paragraph, JSON).\n3. **Define your audience**: Who is this for? Beginners? Experts?\n4. **Set constraints**: Word count, tone, length, language.\n\nYour current prompt: "${promptContext.slice(0, 80)}${promptContext.length > 80 ? '…' : ''}" — try adding at least one of the above!`;
  }

  if (msg.includes('example') || msg.includes('sample')) {
    return `Here's an example of a well-structured prompt:\n\n"Act as a senior content strategist. Write a 150-word product description for a B2B SaaS tool that automates invoice processing. Target audience: CFOs of mid-sized companies. Tone: professional and concise. Format: two short paragraphs."\n\nNotice how it specifies: role, task, length, audience, tone, and format.`;
  }

  if (msg.includes('role') || msg.includes('act as') || msg.includes('persona')) {
    return `Adding a role ("Act as a...") tells the AI what perspective and expertise level to adopt.\n\nExamples:\n- "Act as a UX researcher"\n- "Act as a senior Python developer"\n- "Act as a startup marketing expert"\n\nThis alone can significantly improve the relevance and quality of the response.`;
  }

  if (msg.includes('format') || msg.includes('output') || msg.includes('structure')) {
    return `Specifying output format is crucial. You can ask for:\n\n- **Bullet lists** – great for steps or features\n- **Tables** – good for comparisons\n- **JSON** – for structured data\n- **Paragraphs** – for narrative content\n- **Headers + sections** – for long-form content\n\nExample: "Format the output as a numbered list with a brief explanation for each item."`;
  }

  if (msg.includes('vague') || msg.includes('specific') || msg.includes('clear')) {
    return `To make your prompt less vague:\n\n- Replace "good" → "concise and data-driven"\n- Replace "soon" → "within 2 business days"\n- Replace "some" → "exactly 3"\n- Replace "stuff" → the actual subject matter\n\nThe more specific your prompt, the more predictable and useful the output.`;
  }

  if (msg.includes('length') || msg.includes('word') || msg.includes('short') || msg.includes('long')) {
    return `Always specify length when it matters:\n\n- "In exactly 100 words"\n- "In 2-3 sentences"\n- "Keep it under 500 characters"\n- "Write a comprehensive 800-word article"\n\nWithout a length constraint, AI responses can vary wildly.`;
  }

  return `Great question! Here are some general tips for your prompt:\n\n- **Be specific** about what you want\n- **Add context** about your use case\n- **Define the audience** who will read the output\n- **Specify format** (list, table, paragraph)\n- **Set a tone** (formal, casual, technical)\n\nFeel free to ask me about any specific aspect of your prompt and I'll give you targeted advice!`;
}
