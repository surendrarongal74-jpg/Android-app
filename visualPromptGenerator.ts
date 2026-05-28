import { generateVisualPrompt, generateStoryImage as generateSceneImage } from '../lib/ai';

export async function generateChatAtmosphere(mood: string, vibeLevel: number, timeOfDay: string) {
  const context = `A romantic chat background reflected by ${mood} emotions. Connection level is ${vibeLevel}%. Time is ${timeOfDay}.`;
  const prompt = await generateVisualPrompt(context, mood, "dreamy and atmospheric");
  return await generateSceneImage(prompt);
}

export async function generateStoryBackground(scene: string, tension: number, stats: any) {
  const context = `Story Scene: ${scene}. Emotional Tension: ${tension}/100. Love: ${stats.love}, Chemistry: ${stats.chemistry}.`;
  const prompt = await generateVisualPrompt(context, "high intensity romance", "cinematic anime");
  return await generateSceneImage(prompt);
}

export async function generateMemorySnapshot(recap: string) {
  const context = `A beautiful memory of a couple: ${recap}. This is an emotional peak moment.`;
  const prompt = await generateVisualPrompt(context, "nostalgic and deeply romantic", "vintage polaroid cinematic");
  return await generateSceneImage(prompt);
}
