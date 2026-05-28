export const FALLBACK_MODELS = [
  "google/gemini-2.5-flash",
  "meta-llama/llama-3.3-70b-instruct",
  "google/gemini-2.5-pro",
  "deepseek/deepseek-chat",
  "anthropic/claude-3-5-sonnet",
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku"
];

export function getNextModel(currentModel: string | null): string {
  if (!currentModel) return FALLBACK_MODELS[0];
  const index = FALLBACK_MODELS.indexOf(currentModel);
  if (index === -1 || index === FALLBACK_MODELS.length - 1) return FALLBACK_MODELS[0];
  return FALLBACK_MODELS[index + 1];
}
