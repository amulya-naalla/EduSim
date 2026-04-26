/**
 * api.js — Groq API integration (OpenAI-compatible)
 * Handles streaming teacher turns and one-shot peer answers.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Stream a teacher turn. Calls onChunk for each text fragment, onDone when complete.
 * @param {Array<{role:string, content:string}>} messages
 * @param {string} systemPrompt
 * @param {(chunk: string) => void} onChunk
 * @param {(fullText: string) => void} onDone
 * @param {() => void} onError
 */
export async function streamTeacherTurn(messages, systemPrompt, onChunk, onDone, onError) {
  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        max_tokens: 600,
        temperature: 0.75,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[EduSim API] Error:', err);
      onError?.();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch (_) { /* ignore parse errors on partial chunks */ }
      }
    }

    onDone(fullText);
  } catch (err) {
    console.error('[EduSim API] Fetch error:', err);
    onError?.();
  }
}

/**
 * Get a short peer answer (non-streamed).
 * @param {string} peerName
 * @param {'topper'|'average'|'struggling'} level
 * @param {string} concept
 * @param {string} question
 * @param {string|null} pdfContext
 * @returns {Promise<string>}
 */
export async function getPeerAnswer(peerName, level, concept, question, pdfContext = null) {
  const levelInstruction = {
    topper: 'Give a confident, correct, concise answer (1–2 sentences).',
    average: 'Give a mostly correct answer with slight hesitation (1–2 sentences).',
    struggling: 'Give a plausible but incorrect or confused answer (1–2 sentences). Sound unsure.',
  }[level] || 'Give a brief answer.';

  const contextInstruction = pdfContext 
    ? `\nBase your answer EXCLUSIVELY on this text:\n"${pdfContext}"` 
    : '';

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        max_tokens: 80,
        temperature: 0.8,
        messages: [
          {
            role: 'system',
            content: `You are ${peerName}, a college student in a ${concept} class. ${levelInstruction}${contextInstruction} Speak naturally, in first person. No narration, just the answer spoken aloud.`,
          },
          { role: 'user', content: question },
        ],
      }),
    });

    if (!response.ok) return level === 'struggling' ? "I'm not sure about that." : 'Something like that, I think.';
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '...';
  } catch {
    return level === 'struggling' ? "I... uh... I'm not sure." : "I believe that's correct.";
  }
}

/**
 * Fallback text when API is unavailable.
 */
export const FALLBACK_DIALOGUE = [
  "Let me gather my thoughts for a moment...",
  "That is a fascinating area. Give me just a second.",
  "Interesting question - let me think through this carefully.",
];

export function getFallbackDialogue() {
  return FALLBACK_DIALOGUE[Math.floor(Math.random() * FALLBACK_DIALOGUE.length)];
}
