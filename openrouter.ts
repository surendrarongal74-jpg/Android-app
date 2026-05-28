import { AIRA_PERSONALITY } from "./personality";
import { FALLBACK_MODELS, getNextModel } from "./fallbackModels";
import { StreamHandler } from "./streamHandler";

export interface AIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  spaceId?: string;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (err: any) => void;
}

export class OpenRouterClient {
  private currentModel: string = FALLBACK_MODELS[0];

  async streamChat(messages: any[], options: AIChatOptions = {}) {
    const { 
      onToken = () => {}, 
      onComplete = () => {}, 
      onError = () => {} 
    } = options;

    // Direct routing: classify the last user message
    let model = options.model;
    if (!model) {
      // safe extraction of the last user text content (string or array)
      const lastUserMsg = [...messages].reverse().find(m => m?.role === 'user')?.content;
      let lastUserMsgText = '';
      if (typeof lastUserMsg === 'string') {
        lastUserMsgText = lastUserMsg;
      } else if (Array.isArray(lastUserMsg)) {
        lastUserMsgText = lastUserMsg.find((part: any) => part.type === 'text')?.text || '';
      }
      const lastUserMsgLower = lastUserMsgText.toLowerCase();

      // Check if there is an image uploaded in the message stack
      const hasVisionAsset = messages.some(msg => 
        Array.isArray(msg.content) && msg.content.some((part: any) => part.type === 'image_url')
      );

      const isDeepEmotionalMoment = 
        lastUserMsgLower.includes('feel') || 
        lastUserMsgLower.includes('love') || 
        lastUserMsgLower.includes('sad') || 
        lastUserMsgLower.includes('hurt') || 
        lastUserMsgLower.includes('emotion') || 
        lastUserMsgLower.includes('relationship') || 
        lastUserMsgLower.includes('together') || 
        lastUserMsgLower.includes('future') || 
        lastUserMsgLower.includes('dream') || 
        lastUserMsgLower.includes('scared') || 
        lastUserMsgLower.includes('worry') || 
        lastUserMsgLower.includes('marry') || 
        lastUserMsgLower.includes('broken') || 
        lastUserMsgLower.includes('trust');

      if (hasVisionAsset) {
        // Multi-modal Vision Layer (Gemini-2.5-Flash is extremely fast and accurate with image structures)
        model = "google/gemini-2.5-flash";
      } else if (isDeepEmotionalMoment) {
        // Deep Emotional Context Layer (Gemini-2.5-Pro)
        model = "google/gemini-2.5-pro";
      } else {
        // Swift Response Layer (default ultra-fast Gemini 2.5 Flash for <1s generation)
        model = "google/gemini-2.5-flash";
      }
    }

    // Build the anti-repetition negative constraints dynamically
    let dynamicSystemPrompt = AIRA_PERSONALITY.systemPrompt;
    if (options.spaceId) {
      try {
        const stored = localStorage.getItem(`aira_recent_responses_${options.spaceId}`);
        if (stored) {
          const previousResponses: string[] = JSON.parse(stored);
          if (previousResponses && previousResponses.length > 0) {
            dynamicSystemPrompt += `\n\nCRITICAL ANTI-REPETITION CONSTRAINT:\nDO NOT USE, MIMIC, OR REPEAT ANY OF THESE RECENT USER-FACING STATEMENTS DIRECTLY OR IN SIMILAR PHRASING OR STRUCTURAL METAPHORS:\n${previousResponses.slice(0, 10).map((resp, i) => `${i + 1}. "${resp}"`).join("\n")}\n\nDeliver a completely fresh, unique semantic perspective and wording. Use custom emojis context-awarely.`;
          }
        }
      } catch (err) {
        console.warn("Could not fetch preceding aira answers for blacklist:", err);
      }
    }

    try {
      const response = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: dynamicSystemPrompt },
            ...messages
          ],
          model
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const handler = new StreamHandler({
        onToken,
        onError,
        onComplete: (full) => {
          this.currentModel = model!; // Success, keep model
          onComplete(full);
        }
      });

      await handler.processStream(response);
    } catch (err) {
      console.error("OpenRouter Streaming Error with model:", model, err);
      // Fallback logic
      const nextModel = getNextModel(model || this.currentModel);
      if (nextModel !== FALLBACK_MODELS[0]) {
        console.log(`Retrying streamChat with fallback model: ${nextModel}`);
        await this.streamChat(messages, { ...options, model: nextModel });
      } else {
        onError(err);
      }
    }
  }
}
