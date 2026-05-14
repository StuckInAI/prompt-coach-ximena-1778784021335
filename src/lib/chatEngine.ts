export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CANNED_RESPONSES: Array<{ pattern: RegExp; reply: string }> = [
  {
    pattern: /why|matter|important/i,
    reply: "Great question! AI models generate text based on probability — the more specific your prompt, the less guessing the AI has to do. Vague language forces the model to 'fill in the blanks' in unpredictable ways, often producing generic output.",
  },
  {
    pattern: /tone|voice|style/i,
    reply: "Tone tells the AI how to 'sound'. Without it, the model defaults to a neutral, often formal style. Try appending: \"Use a conversational, friendly tone — like explaining to a smart friend.\"",
  },
  {
    pattern: /audience|user|customer|reader/i,
    reply: "Defining your audience helps the AI calibrate vocabulary, depth, and examples. For instance, 'non-technical founder' signals: avoid jargon, use business analogies, keep it accessible.",
  },
  {
    pattern: /format|structure|layout|bullet|list/i,
    reply: "Specifying a format (bullet list, numbered steps, table, paragraph) prevents the AI from choosing one you didn't want. Add: \"Format as a numbered list with 5 items, each under 20 words.\"",
  },
  {
    pattern: /length|word|long|short|brief/i,
    reply: "Concrete length constraints work best: \"under 80 words\", \"3 sentences\", \"5 bullet points\". Relative terms like 'brief' or 'short' are interpreted differently by every model.",
  },
  {
    pattern: /rewrite|improve|fix|better|rephrase/i,
    reply: "Here's a rewrite pattern that works well:\n\n[Action] + [Output format] + [Audience] + [Tone] + [Length/Constraints]\n\nFor example: \"Write a 3-sentence product description (output: plain paragraph) for startup founders (audience) in a confident, jargon-free tone (tone), under 60 words.\"",
  },
  {
    pattern: /example|sample|template/i,
    reply: "A strong prompt template:\n\nRole: You are a [role].\nTask: [Specific action verb] a [output type] about [topic].\nAudience: [Describe them].\nTone: [Adjective(s)].\nFormat: [Structure].\nLength: [Constraint].\nConstraints: [Any extra rules].",
  },
  {
    pattern: /context|background|info/i,
    reply: "Adding context (what the output is for, who will read it, what happened before) dramatically improves AI output. Think of it like briefing a new employee — more context means fewer surprises.",
  },
];

const FALLBACK_RESPONSES = [
  "That's a great question about prompt engineering! The key is specificity — the more precise your instructions, the more predictable and useful the AI's output will be.",
  "Think of your prompt as a job description for the AI. The clearer the requirements, the better the candidate (output) you'll attract.",
  "One technique I'd recommend: read your prompt aloud and ask 'could this mean two different things?' If yes, clarify until there's only one interpretation.",
  "Iterating on prompts is normal! Start with your best attempt, review the AI's output, then identify what was missing or misunderstood and add it as an explicit instruction.",
  "Try the 'journalist test': does your prompt answer Who, What, Where, When, Why, and How? Each missing element is a potential source of vagueness.",
];

let fallbackIndex = 0;

export async function getChatReply(history: ChatMessage[], promptContext: string): Promise<string> {
  // Simulate a short delay
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

  const lastUserMsg = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';

  // Check for canned responses
  for (const cr of CANNED_RESPONSES) {
    if (cr.pattern.test(lastUserMsg)) {
      return cr.reply;
    }
  }

  // Context-aware response if prompt is present
  if (promptContext.trim()) {
    const wordCount = promptContext.trim().split(/\s+/).length;
    if (wordCount < 10) {
      return `Your prompt is quite short (${wordCount} words). AI models generally need at least 20–30 words to produce targeted output. Try adding: what type of output you want, who it's for, and the desired tone.`;
    }
    if (!/(tone|voice|style|professional|casual|formal|friendly)/.test(promptContext)) {
      return "I notice your prompt doesn't specify a tone. This is one of the most impactful things you can add. Try appending: \"Tone: [professional/casual/friendly/authoritative].\"";
    }
  }

  // Rotate fallbacks
  const reply = FALLBACK_RESPONSES[fallbackIndex % FALLBACK_RESPONSES.length];
  fallbackIndex++;
  return reply;
}
