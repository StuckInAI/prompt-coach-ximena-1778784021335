import type { FeedbackIssue } from '@/types';

const RULES: Array<{
  id: string;
  type: FeedbackIssue['type'];
  shortLabel: string;
  match: RegExp;
  explanation: string;
  suggestion: (m: RegExpMatchArray) => string;
}> = [
  {
    id: 'vague-thing',
    type: 'vague',
    shortLabel: 'Vague subject',
    match: /\b(thing|stuff|it|this|that|something|anything|everything)\b/gi,
    explanation: 'This word is too vague. Specify exactly what you mean.',
    suggestion: () => 'Replace with a concrete noun or concept.',
  },
  {
    id: 'vague-good',
    type: 'vague',
    shortLabel: 'Unclear quality descriptor',
    match: /\b(good|bad|nice|great|better|best|improve|improved|interesting|relevant)\b/gi,
    explanation: 'Qualitative words without criteria are ambiguous to the AI.',
    suggestion: () => 'Define what \'good\' means: e.g., "concise", "data-driven", "under 200 words".',
  },
  {
    id: 'missing-audience',
    type: 'missing',
    shortLabel: 'No target audience',
    match: /^(?!.*\b(audience|reader|user|customer|beginner|expert|developer|manager|student|team)\b).{80,}/is,
    explanation: 'Without knowing who this is for, the AI cannot tailor tone or depth.',
    suggestion: () => 'Add: "Target audience: [describe your reader]".',
  },
  {
    id: 'missing-format',
    type: 'missing',
    shortLabel: 'No output format specified',
    match: /^(?!.*\b(list|bullet|table|paragraph|json|markdown|essay|email|summary|outline|step|numbered)\b).{60,}/is,
    explanation: 'Specifying a format (e.g., bullet list, JSON, 3 paragraphs) greatly improves output quality.',
    suggestion: () => 'Add: "Format the response as [bullet list / JSON / numbered steps / etc.]".',
  },
  {
    id: 'missing-length',
    type: 'missing',
    shortLabel: 'No length constraint',
    match: /^(?!.*\b(word|words|sentence|sentences|paragraph|paragraphs|brief|concise|short|long|\d+\s*(word|char))\b).{100,}/is,
    explanation: 'Without a length hint the AI may produce responses that are too long or too short.',
    suggestion: () => 'Add: "Keep the response under [X] words" or "Write 2–3 paragraphs".',
  },
  {
    id: 'improve-role',
    type: 'improvement',
    shortLabel: 'Add a role / persona',
    match: /^(?!.*\b(you are|act as|as an?|pretend|role|expert|specialist|professional)\b).{50,}/is,
    explanation: 'Assigning a role (e.g., "You are a senior copywriter") improves the quality and consistency of responses.',
    suggestion: () => 'Start with: "You are a [role]. [task]".',
  },
  {
    id: 'improve-tone',
    type: 'improvement',
    shortLabel: 'Tone not specified',
    match: /^(?!.*\b(tone|formal|informal|casual|professional|friendly|serious|humorous|empathetic|direct|technical)\b).{70,}/is,
    explanation: 'Mentioning the desired tone prevents mismatched voice.',
    suggestion: () => 'Add: "Tone: [professional / casual / empathetic / etc.]".',
  },
];

export function analyzeFeedback(text: string): FeedbackIssue[] {
  if (!text.trim()) return [];
  const issues: FeedbackIssue[] = [];
  const usedRanges: Array<[number, number]> = [];

  for (const rule of RULES) {
    const regex = new RegExp(rule.match.source, rule.match.flags);
    let m: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      // Avoid overlaps
      const overlaps = usedRanges.some(([s, e]) => start < e && end > s);
      if (overlaps) continue;
      // For whole-prompt pattern matches, highlight only the first 30 chars
      const isWholePrompt = rule.match.flags.includes('s') && m[0].length > 60;
      const highlightEnd = isWholePrompt ? Math.min(start + 30, end) : end;
      usedRanges.push([start, highlightEnd]);
      issues.push({
        id: `${rule.id}-${start}`,
        type: rule.type,
        shortLabel: rule.shortLabel,
        explanation: rule.explanation,
        suggestion: rule.suggestion(m),
        startIndex: start,
        endIndex: highlightEnd,
      });
      if (isWholePrompt) break; // one hit per whole-prompt rule
    }
  }

  return issues.sort((a, b) => a.startIndex - b.startIndex);
}

export function generateChatReply(userMessage: string, promptContext: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('role') || msg.includes('persona')) {
    return 'Assigning a role anchors the AI\'s perspective. Try opening with "You are a [expert role]. Your task is to..." — this alone can dramatically improve output quality.';
  }

  if (msg.includes('vague') || msg.includes('specific') || msg.includes('clear')) {
    return 'Vagueness is the #1 reason prompts underperform. Replace generic words ("good", "stuff", "things") with precise nouns and measurable criteria. E.g., instead of "write a good summary" try "write a 3-sentence summary that covers the main argument, key evidence, and conclusion".';
  }

  if (msg.includes('format') || msg.includes('structure') || msg.includes('output')) {
    return 'Formatting instructions dramatically improve consistency. You can request:\n\n- Bullet lists\n- Numbered steps\n- JSON / YAML\n- Markdown with headers\n- A table with columns\n\nJust add "Format your response as..." at the end of your prompt.';
  }

  if (msg.includes('length') || msg.includes('word') || msg.includes('short') || msg.includes('long')) {
    return 'Length constraints prevent bloat. Be explicit:\n\n- "In exactly 3 bullet points"\n- "Under 150 words"\n- "One paragraph, max 5 sentences"\n\nThe AI will almost always respect these limits.';
  }

  if (msg.includes('audience') || msg.includes('reader') || msg.includes('user')) {
    return 'Defining your audience lets the AI calibrate vocabulary, depth, and assumed knowledge. Try: "Assume the reader is a [non-technical product manager / senior developer / curious 12-year-old]".';
  }

  if (msg.includes('tone') || msg.includes('style') || msg.includes('voice')) {
    return 'Tone guidance prevents mismatched voice. Options include:\n\n- Professional & concise\n- Friendly & conversational\n- Academic & formal\n- Punchy & direct\n\nPair tone with audience for best results.';
  }

  if (msg.includes('example') || msg.includes('sample') || msg.includes('show me')) {
    const context = promptContext.slice(0, 80);
    return 'Here\'s an improved version of your prompt structure:\n\n"You are a [expert]. Your task is to [specific action] for [target audience]. Format: [list/table/paragraphs]. Tone: [professional/casual]. Length: [constraint]."\n\n' + (context ? 'Applied to your current prompt: "' + context + '..."' : 'Start with that template and fill in the brackets.');
  }

  if (msg.includes('improve') || msg.includes('better') || msg.includes('fix') || msg.includes('help')) {
    const issues: string[] = [];
    if (promptContext.length < 50) issues.push('your prompt is quite short — add more context');
    if (!/\b(you are|act as)\b/i.test(promptContext)) issues.push('assign a role ("You are a...")');
    if (!/\b(list|bullet|json|table|paragraph|step)\b/i.test(promptContext)) issues.push('specify an output format');
    if (!/\b(audience|reader|user)\b/i.test(promptContext)) issues.push('define your target audience');
    if (issues.length === 0) return 'Your prompt looks solid! Consider adding edge-case constraints or example outputs to push it further.';
    return 'To improve your prompt, try:\n\n' + issues.map((s, i) => `${i + 1}. ${s.charAt(0).toUpperCase() + s.slice(1)}`).join('\n');
  }

  if (msg.includes('tip') || msg.includes('advice') || msg.includes('trick') || msg.includes('best practice')) {
    return 'Great question! Here are some general prompt engineering tips:\n\n1. Be specific - Vague prompts get vague answers.\n2. Assign a role - "You are a [expert]" improves quality.\n3. Set the format - Tell the AI how to structure its response.\n4. Add constraints - Length, tone, audience all matter.\n5. Iterate - Treat prompts like code: refine and test.\n\nWhat aspect of your prompt would you like to improve?';
  }

  // Default
  return 'I\'m here to help you write better prompts! You can ask me about:\n\n- How to make your prompt more specific\n- Adding a role or persona\n- Specifying output format\n- Setting length constraints\n- Defining your audience\n\nWhat would you like to work on?';
}
