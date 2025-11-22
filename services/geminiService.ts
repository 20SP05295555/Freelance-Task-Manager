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
