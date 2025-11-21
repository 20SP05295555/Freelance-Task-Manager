import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
// Note: In a production environment, this key should be proxied through a backend.
// For this implementation, we assume process.env.API_KEY is available as per instructions.
// We add a safety check to avoid crashing if process is undefined in the browser.
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.API_KEY || '';
  }
  // Fallback to prevent crash, though API calls will fail without a key
  return '';
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export const generateReviewContent = async (
  companyName: string,
  type: 'google' | 'trustpilot',
  keywords: string
): Promise<string> => {
  if (!apiKey) {
    console.warn("Gemini API Key is missing.");
    return "API Key missing. Please configure process.env.API_KEY to use AI generation.";
  }

  try {
    const prompt = `
      Write a natural, authentic 5-star review for a company named "${companyName}" on ${type}.
      The review should mention these keywords/topics: ${keywords}.
      Keep it between 20-50 words. Make it sound like a real customer.
      Do not use quotation marks.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Error generating content:", error);
    return "Error generating content. Please try again.";
  }
};