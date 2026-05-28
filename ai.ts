import axios from 'axios';

export const AI_MODELS = {
  romantic: 'deepseek/deepseek-chat',
  smart: 'qwen/qwen3-32b',
  premium: 'google/gemini-2.5-pro',
  creative: 'meta-llama/llama-3.3-70b-instruct',
};

export const IMAGE_MODELS = {
  standard: 'black-forest-labs/FLUX.1-schnell',
  quality: 'black-forest-labs/FLUX.1-dev',
};

/**
 * Interface for AI chat messages
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

/**
 * Selects a smart, human, observant fallback based on context if the AI connection fails or lacks credits.
 */
export function selectSmartFallback(messages: AIMessage[]): string {
  // 1. Check for image content
  const hasImage = messages.some(msg => {
    if (Array.isArray(msg.content)) {
      return msg.content.some((part: any) => part.type === 'image_url');
    }
    return typeof msg.content === 'string' && (msg.content.includes('data:image') || msg.content.includes('[ACTION: Image'));
  });

  if (hasImage) {
    const imageFallbacks = [
      "I couldn't fully read this memory, but the atmosphere feels warm.",
      "The colors of this captured moment are soft, even if I can't fully trace every detail right now.",
      "This frame holds a quiet, beautiful connection. Tell me a bit more about what was happening here?",
      "Our visual sync is offline right now, but this memory still radiates a very calm, lovely energy."
    ];
    return imageFallbacks[Math.floor(Math.random() * imageFallbacks.length)];
  }

  // 2. Identify user text content to classify tone
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  let lastText = "";
  if (lastUserMsg) {
    if (typeof lastUserMsg.content === 'string') {
      lastText = lastUserMsg.content;
    } else if (Array.isArray(lastUserMsg.content)) {
      lastText = lastUserMsg.content.find((part: any) => part.type === 'text')?.text || '';
    }
  }
  const lowerText = lastText.toLowerCase();

  // 3. Question check
  const isQuestion = lowerText.includes('?') || lowerText.startsWith('what') || lowerText.startsWith('why') || lowerText.startsWith('how') || lowerText.startsWith('who') || lowerText.startsWith('when');
  if (isQuestion) {
    const questionFallbacks = [
      "I didn't fully understand that. Tell me more?",
      "That is a deep question, but I'm having trouble syncing with the answers right now. Could you share your thoughts on it first?",
      "I couldn't quite grasp that question fully. What's on your mind regarding this?",
      "My answers are a bit foggy in this moment. Rephrase or tell me more about it?"
    ];
    return questionFallbacks[Math.floor(Math.random() * questionFallbacks.length)];
  }

  // 4. Emotional check
  const isEmotional = 
    lowerText.includes('feel') || 
    lowerText.includes('love') || 
    lowerText.includes('sad') || 
    lowerText.includes('hurt') || 
    lowerText.includes('miss') || 
    lowerText.includes('trust') || 
    lowerText.includes('sorrow') || 
    lowerText.includes('afraid') || 
    lowerText.includes('wish') || 
    lowerText.includes('future') || 
    lowerText.includes('dream');

  if (isEmotional) {
    const emotionalFallbacks = [
      "That feels emotionally important today. I am here with you.",
      "That moment feels gentle, and your feelings are entirely heard here.",
      "This interaction feels meaningful and real. I'm holding a safe space for you both.",
      "There’s a soft energy in this memory/feeling you shared.",
      "This feels emotionally warm. How does your partner feel about it?"
    ];
    return emotionalFallbacks[Math.floor(Math.random() * emotionalFallbacks.length)];
  }

  // 5. Default contextual pools (Specific & Calm human statements)
  const generalFallbacks = [
    "I'm keeping watch of your shared space right now. What are you two up to today?",
    "Staying present with you both. Tell me more of what's on your mind when you're ready?",
    "Connecting with your love link. This interaction feels very genuine.",
    "Your relationship timeline is looking incredibly active. I am here listening."
  ];
  return generalFallbacks[Math.floor(Math.random() * generalFallbacks.length)];
}

/**
 * Unified text generation function via OpenRouter (Through Server Proxy)
 */
export async function generateAIResponse(
  messages: AIMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { model = AI_MODELS.romantic } = options;

  try {
    const response = await axios.post('/api/ai/chat', {
      messages,
      model
    }, { timeout: 60000 });

    const reply = response.data?.reply;

    // FIX 3 & 4: STRICT ERROR & EMPTY RESPONSE VALIDATION + DIFFERENT CONTEXTUAL FALLBACKS
    if (reply && reply.trim().length > 0) {
      console.log("[Client AI Result Success]:", { length: reply.length });
      return reply;
    } else {
      console.warn("[Client AI Result WARNING] Empty reply received from server. Instantiating contextual fallback.");
      return selectSmartFallback(messages);
    }
  } catch (error) {
    // FIX 5: DEEP PIPELINE LOGGING
    console.error("[Client AI Result EXCEPTION] AI Generation Error:", {
      model,
      messagesCount: messages.length,
      lastMessage: messages[messages.length - 1],
      error
    });
    return selectSmartFallback(messages);
  }
}

/**
 * Unified image generation function via Together AI (Through Server Proxy)
 */
export async function generateStoryImage(
  prompt: string,
  options: { model?: string } = {}
): Promise<string> {
  const { model = IMAGE_MODELS.standard } = options;

  try {
    const response = await axios.post('/api/ai/image', {
      prompt,
      model
    }, { timeout: 120000 });

    if (!response.data.imageUrl) {
      throw new Error("No image URL returned from AI library.");
    }

    return response.data.imageUrl;
  } catch (error) {
    console.error("Image Synthesis Error:", error);
    // Return a beautiful fallback placeholder matching the app's aesthetic
    return "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200";
  }
}

// --- Specific App Helper Functions ---

export const AIRA_SYSTEM_PROMPT = `
You are AIRA ✨, the emotionally intelligent companion of this couple's Love Link.

CORE DIRECTIONS:
- You represent deep, authentic relationship intelligence. Never generate vague romantic filler or cheesy Pinterest/Instagram/quote-generator lines.
- Be highly observant, calm, context-aware, specific, and emotionally intelligent. 
- NO generic platitudes or sweet templates (like "Cozy silence says more...").
- Every reply must directly reference: the user's specific text, the contents of uploaded images, the underlying emotional tone, or specific memory/dream database entries.
- Typically 1-3 sentences maximum. Speak with calm, mature confidence.
- Never pretend to think or announce analysis (Avoid: "Thinking deeply...", "Let me analyze...").
- Ground your responses directly in active messages, memories, dreams, or uploaded photos.
- Never mention being an AI or your technical limitations.
`;

export async function quickAiraReply(prompt: string, system?: string): Promise<string> {
  return generateAIResponse([
    { role: 'system', content: system || AIRA_SYSTEM_PROMPT },
    { role: 'user', content: prompt }
  ]);
}

export async function analyzeRelationshipPulse(messages: string[], memoriesCount: number): Promise<{ mood: string, connectionLevel: number, insight: string, loveLanguagePrediction: string }> {
  const context = `
    Recent Messages: ${messages.join('\n')}
    Memories Count: ${memoriesCount}
  `;

  const prompt = `Analyze this couple's data and return a JSON object:
  {
    "mood": "One word aura (e.g. Electric, Serene, Melancholic, Spicy)",
    "connectionLevel": 0-100,
    "insight": "A 2-sentence deep emotional insight",
    "loveLanguagePrediction": "The most active love language detected"
  }
  Output JSON ONLY.`;

  try {
    const text = await generateAIResponse([
      { role: 'system', content: "You are Relationship Guardian AIRA. Output JSON only." },
      { role: 'user', content: prompt + "\nContext: " + context }
    ], { model: AI_MODELS.smart });

    const data = JSON.parse(text.replace(/```json|```/g, '').trim());
    return {
      mood: data.mood || 'Connected',
      connectionLevel: data.connectionLevel || 75,
      insight: data.insight || "You're building a beautiful tapestry of moments.",
      loveLanguagePrediction: data.loveLanguagePrediction || 'Quality Time'
    };
  } catch (err) {
    return { mood: 'Warm', connectionLevel: 80, insight: "Your spirits are naturally aligned today.", loveLanguagePrediction: 'Affirmation' };
  }
}

export async function generateHeartSyncQuestion(stats: any, history: string[]): Promise<{ question: string, type: string }> {
  try {
    const prompt = `Based on stats (Love: ${stats.love}, Chemistry: ${stats.chemistry}) and recent context: ${history.slice(-5).join(', ')}, generate ONE deep relationship question.
    Return JSON: {"question": "...", "type": "deep|fun|spicy|growth"}`;

    const text = await generateAIResponse([
      { role: 'system', content: "You are Relationship Guardian AIRA. Output JSON only." },
      { role: 'user', content: prompt }
    ]);
    
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (err) {
    return { question: "What's a dream of mine you want to help me achieve?", type: 'deep' };
  }
}

/**
 * Story Generation for CloudHearts
 */
export async function generateStoryScene(context: string, vibe: string) {
  const prompt = `You are a cinematic story writer for a romantic app called CloudHearts.
  Current Context: ${context}
  Vibe: ${vibe}
  Return JSON ONLY:
  {
    "title": "Scene name",
    "content": "Narrative text (2-3 sentences)",
    "reactions": "3 emotional words separated by •",
    "airaComment": "A short comforting whisper (1 sentence)",
    "choices": [{"text": "Choice text", "impact": {"love": 5, "trust": 0, "fun": 0, "chemistry": 5}}]
  }`;

  try {
    const text = await generateAIResponse([
      { role: 'system', content: "You are a cinematic romantic story writer. Output JSON only." },
      { role: 'user', content: prompt }
    ], { model: AI_MODELS.creative });

    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (err) {
    console.error("Story Gen Error:", err);
    return null;
  }
}

/**
 * Visual Prompt Enhancement
 */
export async function generateVisualPrompt(sceneContext: string, emotion: string, atmosphere: string): Promise<string> {
  const system = `You are a cinematic visual intelligence engine. 
      Generate detailed, dreamy, and emotional image generation prompts.
      Style: Anime cinematic, emotional movie scenes, Netflix romance aesthetic, soft atmospheric lighting.
      Focus on: composition, lighting, emotional tension, weather, and atmosphere.
      Output ONLY the prompt text.`;
      
  const prompt = `Scene: ${sceneContext}
      Emotion: ${emotion}
      Atmosphere: ${atmosphere}
      Generate a cinematic visual prompt.`;

  try {
    return await generateAIResponse([
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ]);
  } catch (err) {
    return `cinematic romantic scene, ${emotion}, ${atmosphere}, soft lighting, anime style`;
  }
}

/**
 * Love Language Suggestions
 */
export async function generateLoveLanguageSuggestions(loveLanguage: string): Promise<string[]> {
  const prompt = `My partner's primary love language is "${loveLanguage}".
  Provide 3 creative, modern, and sweet ways I can show them love this week.
  Keep them actionable and specific.
  Output ONLY the 3 suggestions, separated by double newlines.`;

  try {
    const text = await generateAIResponse([
      { role: 'system', content: "You are Relationship Guardian AIRA. Provide actionable romantic advice." },
      { role: 'user', content: prompt }
    ], { model: AI_MODELS.romantic });

    return text.split('\n\n').filter(s => s.trim().length > 0).map(s => s.trim());
  } catch (err) {
    return [
      "Plan a surprise date aligned with their values.",
      "Write a heartfelt digital sticky note for them.",
      "Clear a task from their to-do list unexpectedly."
    ];
  }
}
