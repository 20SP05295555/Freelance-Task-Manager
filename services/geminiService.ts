import { GoogleGenAI, Type } from "@google/genai";

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

export const generateEmailTemplate = async (
  emailType: string,
  context: string
): Promise<{ subject: string; body: string }> => {
  if (!apiKey) {
    console.warn("Gemini API Key is missing.");
    return { subject: "Error", body: "API Key missing. Please configure process.env.API_KEY." };
  }

  try {
    const prompt = `
      Generate a professional email for a freelancer to send to a client.
      Email Type: ${emailType}
      Additional Context: ${context}
      
      The tone should be friendly yet professional. Keep the body concise and clear.
      Format the response as a JSON object with "subject" and "body" keys.
      For the body, use newline characters (\\n) for paragraph breaks.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "The email subject line." },
            body: { type: Type.STRING, description: "The email body content, with \\n for newlines." }
          },
          required: ["subject", "body"]
        }
      }
    });

    const text = response.text?.trim() || '{}';
    return JSON.parse(text);

  } catch (error) {
    console.error("Error generating email template:", error);
    return { subject: "Generation Error", body: "Failed to generate email content. Please check the console for details." };
  }
};

export const analyzeClientSentiment = async (
  clientName: string,
  reviews: string[],
  feedback: string[]
): Promise<{ healthScore: number; sentiment: string; keyThemes: string[]; retentionStrategy: string; reviewSummary: string }> => {
  if (!apiKey) return { healthScore: 0, sentiment: 'Error', keyThemes: [], retentionStrategy: 'API Key Missing', reviewSummary: '' };

  try {
    const prompt = `
      Analyze the following data for client "${clientName}".
      
      Reviews they received (written by me/us): ${reviews.join(" | ")}
      Feedback they gave me: ${feedback.join(" | ")}

      1. Determine a "Client Health Score" (0-100) based on how happy they seem.
      2. Identify 3 Key Themes in the relationship.
      3. Suggest a 1-sentence retention strategy.
      4. Write a "Marketing Summary" - a single paragraph combining the best parts of the reviews for a portfolio.

      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER },
            sentiment: { type: Type.STRING },
            keyThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
            retentionStrategy: { type: Type.STRING },
            reviewSummary: { type: Type.STRING }
          },
          required: ["healthScore", "sentiment", "keyThemes", "retentionStrategy", "reviewSummary"]
        }
      }
    });

    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  } catch (e) {
    console.error(e);
    return { healthScore: 50, sentiment: 'Neutral', keyThemes: ['Analysis Failed'], retentionStrategy: 'Try again later', reviewSummary: '' };
  }
};

export const generateSmartProjectPlan = async (
  goal: string
): Promise<{ tasks: { description: string; priority: string; daysFromNow: number }[] }> => {
  if (!apiKey) return { tasks: [] };

  try {
    const prompt = `
      I am a freelancer. My client wants me to: "${goal}".
      Break this down into 3-6 specific, actionable subtasks.
      For each task, assign a priority (High, Medium, Low) and a "daysFromNow" (integer 0-14) representing when it should be due relative to today to ensure smooth progress.
      
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  daysFromNow: { type: Type.NUMBER }
                },
                required: ["description", "priority", "daysFromNow"]
              }
            }
          }
        }
      }
    });

    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  } catch (e) {
    console.error(e);
    return { tasks: [] };
  }
};
