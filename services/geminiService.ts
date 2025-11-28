import { GoogleGenAI, Type } from "@google/genai";

// Initialize lazily to prevent errors if process is undefined during module load
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
    // Fallback if key is missing to avoid crashing immediately, though calls will fail
    aiInstance = new GoogleGenAI({ apiKey: apiKey || 'MISSING_KEY' });
  }
  return aiInstance;
};

/**
 * Simulates verifying an engagement task using Gemini to analyze the proof.
 * In a real app, this might analyze a screenshot or scrape a URL.
 * Here, we analyze the user's provided text/link and context.
 */
export const verifyEngagementProof = async (
  taskTitle: string,
  platform: string,
  proofText: string
): Promise<{ isValid: boolean; reason: string; confidenceScore: number }> => {
  try {
    const model = "gemini-2.5-flash";
    const ai = getAI();
    
    const prompt = `
      You are an AI Fraud Detection Agent for a social media engagement marketplace.
      
      Task Context:
      - Platform: ${platform}
      - Required Action: ${taskTitle}
      
      User Submitted Proof:
      "${proofText}"
      
      Analyze the proof. 
      1. Is the proof relevant to the platform? (e.g., a YouTube link for a YouTube task).
      2. Does it look like spam or a fake string?
      3. If it is a URL, does it look structurally valid for the platform?
      
      Return a JSON object evaluating validity.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER, description: "0 to 100" }
          },
          required: ["isValid", "reason", "confidenceScore"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      isValid: result.isValid ?? false,
      reason: result.reason || "Analysis failed",
      confidenceScore: result.confidenceScore ?? 0
    };

  } catch (error) {
    console.error("Gemini verification failed:", error);
    // Fallback in case of API error (fail safe)
    return { isValid: false, reason: "AI Service Unavailable", confidenceScore: 0 };
  }
};

/**
 * Generates marketing insights for creators based on their campaign performance.
 */
export const generateCampaignInsights = async (campaignTitle: string, platform: string, completions: number) => {
  try {
     const ai = getAI();
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Provide 3 short, punchy tips to improve engagement for a ${platform} campaign titled "${campaignTitle}" which currently has ${completions} completions. Keep it under 50 words total.`
     });
     return response.text;
  } catch (e) {
    return "Optimize your content title and thumbnail for better reach.";
  }
}