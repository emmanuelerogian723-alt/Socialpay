
import { GoogleGenAI, Type } from "@google/genai";

// Initialize lazily to prevent errors if process is undefined during module load
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    // Using the explicitly provided API key
    aiInstance = new GoogleGenAI({ apiKey: "AIzaSyA7Y_eBv29MVK68w3Xbq1fJlCRr25nwvsU" });
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
    
    if (!ai) throw new Error("AI client not initialized");

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
     if (!ai) throw new Error("AI client not initialized");
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Provide 3 short, punchy tips to improve engagement for a ${platform} campaign titled "${campaignTitle}" which currently has ${completions} completions. Keep it under 50 words total.`
     });
     return response.text;
  } catch (e) {
    return "Optimize your content title and thumbnail for better reach.";
  }
}

/**
 * Analyzes chat messages for potential fraud, scams, or attempts to take payment off-platform.
 */
export const analyzeChatRisk = async (message: string): Promise<{ isRisky: boolean; reason: string }> => {
  try {
    const ai = getAI();
    if (!ai) return { isRisky: false, reason: '' };

    const prompt = `
      You are a security bot for a freelance marketplace.
      Analyze the following chat message for security risks.
      
      Look for:
      1. Attempts to pay outside the platform (keywords: PayPal, CashApp, bank transfer, direct).
      2. Attempts to communicate outside (keywords: WhatsApp, Telegram, email me at).
      3. Scam patterns (e.g., asking for password, "trust me").
      
      Message: "${message}"
      
      Return JSON: { isRisky: boolean, reason: string }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isRisky: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["isRisky", "reason"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      isRisky: result.isRisky ?? false,
      reason: result.reason || "Suspicious content detected."
    };

  } catch (e) {
    // Fail safe: simple regex for obvious keywords
    const keywords = ['whatsapp', 'telegram', 'pay me direct', 'bank transfer'];
    const isRisky = keywords.some(k => message.toLowerCase().includes(k));
    return { isRisky, reason: isRisky ? 'Contains prohibited keywords' : '' };
  }
};