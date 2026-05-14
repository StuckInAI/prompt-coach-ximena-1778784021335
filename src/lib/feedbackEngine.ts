import type { FeedbackIssue, IssueType } from '@/types';

export type { FeedbackIssue, IssueType };

export interface FeedbackRule {
  id: string;
  type: IssueType;
  pattern: RegExp;
  shortLabel: string;
  explanation: string;
  suggestion: string;
}

const rules: FeedbackRule[] = [
  {
    id: 'vague-thing',
    type: 'vague',
    pattern: /\bthing(s)?\b/gi,
    shortLabel: 'Vague noun',
    explanation: '"Thing" is very non-specific. Replace it with the actual object or concept you mean.',
    suggestion: 'Replace "thing" with a specific noun (e.g., "feature", "document", "idea").',
  },
  {
    id: 'vague-stuff',
    type: 'vague',
    pattern: /\bstuff\b/gi,
    shortLabel: 'Vague word',
    explanation: '"Stuff" is informal and vague. Be specific about what you\'re referring to.',
    suggestion: 'Replace "stuff" with a concrete description of what you mean.',
  },
  {
    id: 'vague-some',
    type: 'vague',
    pattern: /\bsome\s+(information|details?|data|content|text)\b/gi,
    shortLabel: 'Unquantified request',
    explanation: 'Asking for "some" information is vague. Specify how much or what kind.',
    suggestion: 'Specify quantity or type, e.g., "three key points" or "a detailed breakdown".',
  },
  {
    id: 'vague-good',
    type: 'vague',
    pattern: /\b(good|nice|great|awesome|amazing)\b/gi,
    shortLabel: 'Subjective adjective',
    explanation: 'Subjective adjectives like "good" or "great" don\'t give the AI measurable criteria.',
    suggestion: 'Define what "good" means: e.g., "clear and concise", "persuasive", "technically accurate".',
  },
  {
    id: 'missing-format',
    type: 'missing',
    pattern: /\b(write|create|generate|produce|make)\b(?!.*\b(list|bullet|paragraph|table|json|markdown|format|outline|essay|email|report)\b)/gi,
    shortLabel: 'No output format',
    explanation: 'You haven\'t specified an output format. The AI may guess incorrectly.',
    suggestion: 'Add a format: e.g., "as a bullet list", "in JSON", "as a short paragraph".',
  },
  {
    id: 'missing-audience',
    type: 'missing',
    pattern: /\b(explain|describe|summarize|teach)\b(?!.*\b(audience|reader|beginner|expert|child|professional|developer|manager)\b)/gi,
    shortLabel: 'No target audience',
    explanation: 'Without specifying the audience, the AI can\'t calibrate vocabulary or depth.',
    suggestion: 'Add audience context: e.g., "for a non-technical manager" or "for an experienced developer".',
  },
  {
    id: 'missing-tone',
    type: 'missing',
    pattern: /\b(write|draft|compose)\b(?!.*\b(tone|formal|informal|casual|professional|friendly|serious|humorous|neutral)\b)/gi,
    shortLabel: 'No tone specified',
    explanation: 'No tone has been indicated, leaving the style open to interpretation.',
    suggestion: 'Specify tone: e.g., "in a professional tone" or "casual and friendly".',
  },
  {
    id: 'improvement-role',
    type: 'improvement',
    pattern: /^(?!.*\b(you are|act as|as a|imagine you|pretend|your role)\b)/i,
    shortLabel: 'Add a role',
    explanation: 'Assigning a role to the AI (e.g., "You are an expert copywriter") often improves output quality.',
    suggestion: 'Start with: "You are a [role]. " to frame the AI\'s perspective.',
  },
  {
    id: 'improvement-context',
    type: 'improvement',
    pattern: /^(?!.*\b(context|background|given that|assuming|note that|the goal is)\b)/i,
    shortLabel: 'Add context',
    explanation: 'Providing background context helps the AI understand the situation better.',
    suggestion: 'Add a context sentence: e.g., "The goal is to..." or "This is for...".',
  },
];

interface MatchResult {
  start: number;
  end: number;
}

function findMatches(text: string, pattern: RegExp): MatchResult[] {
  const results: MatchResult[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push({ start: m.index, end: m.index + m[0].length });
    if (!pattern.flags.includes('g')) break;
  }
  return results;
}

export function analyzeFeedback(text: string): FeedbackIssue[] {
  if (!text.trim()) return [];
  const issues: FeedbackIssue[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    const matches = findMatches(text, rule.pattern);
    for (const match of matches) {
      const key = `${rule.id}-${match.start}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({
        id: key,
        ruleId: rule.id,
        type: rule.type,
        shortLabel: rule.shortLabel,
        explanation: rule.explanation,
        suggestion: rule.suggestion,
        matchedText: text.slice(match.start, match.end),
        startIndex: match.start,
        endIndex: match.end,
      });
    }
  }

  // Limit to 8 issues max to avoid overwhelming
  return issues.slice(0, 8);
}

export function generateChatReply(userMessage: string, promptContext: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('improve') || msg.includes('better') || msg.includes('fix')) {
    return `To improve your prompt, consider these steps:\n\n1. **Add a role** – Start with "You are a [expert]..." to frame the AI's expertise.\n2. **Specify format** – Tell the AI exactly how to structure the output (list, JSON, paragraph).\n3. **Define the audience** – Who is this for? A beginner? An expert?\n4. **Set constraints** – Word count, tone, style.\n\nWould you like me to rewrite your prompt with these improvements?`;
  }

  if (msg.includes('example') || msg.includes('sample') || msg.includes('show me')) {
    return `Here's an improved version of a typical prompt:\n\n**Before:** Write a blog post about AI.\n\n**After:** You are an experienced tech writer. Write a 500-word blog post about how AI is changing software development, targeting mid-level developers. Use a conversational tone with 3 subheadings and a short conclusion.\n\nNotice how the improved version adds role, audience, format, length, and tone.`;
  }

  if (msg.includes('role') || msg.includes('persona')) {
    return `Assigning a **role** is one of the most effective prompt techniques.\n\nExamples:\n• "You are a senior software engineer..."\n• "Act as a marketing strategist..."\n• "Imagine you are a Socratic tutor..."\n\nThis primes the AI to respond from a specific perspective, vocabulary, and knowledge base.`;
  }

  if (msg.includes('format') || msg.includes('output') || msg.includes('structure')) {
    return `Specifying **output format** removes ambiguity:\n\n• "Respond in JSON with keys: title, summary, tags"\n• "Use a numbered list"\n• "Write 3 short paragraphs"\n• "Provide a markdown table"\n\nWithout format instructions, the AI may choose a structure that doesn't fit your use case.`;
  }

  if (msg.includes('tone') || msg.includes('style') || msg.includes('voice')) {
    return `**Tone** words to use in your prompt:\n\n• Professional / Formal\n• Casual / Conversational\n• Persuasive / Sales-focused\n• Empathetic / Supportive\n• Technical / Precise\n• Creative / Imaginative\n\nExample: "Write in a friendly, casual tone suitable for a newsletter."\`;
  }

  if (promptContext && promptContext.length > 10) {
    return `Looking at your current prompt, here are some quick wins:\n\n${promptContext.length < 80 ? '• Your prompt is quite short. Add more context about the desired outcome.\n' : ''}${!promptContext.toLowerCase().includes('you are') ? '• Consider adding a role: "You are a [expert]..."\n' : ''}${!promptContext.toLowerCase().includes('format') && !promptContext.toLowerCase().includes('list') ? '• Specify an output format (list, paragraph, JSON, etc.)\n' : ''}\nWould you like help refining a specific part?`;
  }

  return `Great question! Here are some general prompt engineering tips:\n\n1. **Be specific** – Vague prompts get vague answers.\n2. **Assign a role** – "You are a [expert]" improves quality.\n3. **Set the format** – Tell the AI how to structure its response.\n4. **Add constraints** – Length, tone, audience all matter.\n5. **Iterate** – Treat prompts like code: refine and test.\n\nWhat aspect of your prompt would you like to improve?`;
}
