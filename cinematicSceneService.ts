import { generateAIResponse, AI_MODELS, generateStoryImage as generateSceneImage } from '../lib/ai';

export interface CinematicAtmosphere {
  backgroundUrl: string;
  lighting: string;
  musicMood: string;
  ambience: string;
  particleType: 'none' | 'rain' | 'petals' | 'snow' | 'stars';
}

export async function analyzeSceneForAtmosphere(storyContent: string, stats: any): Promise<CinematicAtmosphere> {
  const system = "You are a cinematic atmospheric analyzer. Based on a story scene, you provide lighting details, music mood, and visual effects. Output valid JSON ONLY.";
  const prompt = `Story: ${storyContent}
      Relationship Stats: Love ${stats.love}, Chemistry ${stats.chemistry}
      
      Output JSON format:
      {
        "prompt": "Detailed cinematic prompt for image generation",
        "lighting": "e.g. golden hour, moonlit, neon pink",
        "musicMood": "e.g. soft piano, synthwave, melancholic",
        "ambience": "e.g. rain, distant city, ocean",
        "particleType": "rain" | "petals" | "snow" | "stars" | "none"
      }`;

  try {
    const text = await generateAIResponse([
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ], { model: AI_MODELS.smart });
    
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());
    
    const backgroundUrl = await generateSceneImage(result.prompt);
    
    return {
      backgroundUrl,
      lighting: result.lighting || "soft glow",
      musicMood: result.musicMood || "gentle piano",
      ambience: result.ambience || "quiet",
      particleType: result.particleType || "none"
    };
  } catch (err) {
    console.error("Atmosphere analysis failed", err);
    return {
      backgroundUrl: "",
      lighting: "soft glow",
      musicMood: "gentle piano",
      ambience: "quiet",
      particleType: "none"
    };
  }
}
