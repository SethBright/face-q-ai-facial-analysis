
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const API_KEY = process.env.API_KEY || '';

export const analyzeFaceImage = async (base64Image: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1],
            },
          },
          {
            text: `Analyze this facial portrait for aesthetics. Provide specific scores (1-100) for: 
            Overall aesthetic rating, Potential (attainable improvements), Masculinity index, Skin quality, Jawline definition, and Cheekbones prominence. 
            Also identify the face shape and provide recommendations. Format strictly as JSON.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overall: { type: Type.NUMBER },
          potential: { type: Type.NUMBER },
          masculinity: { type: Type.NUMBER },
          skinQuality: { type: Type.NUMBER },
          jawline: { type: Type.NUMBER },
          cheekbones: { type: Type.NUMBER },
          faceShape: { type: Type.STRING },
          recommendations: {
            type: Type.OBJECT,
            properties: {
              skincare: { type: Type.ARRAY, items: { type: Type.STRING } },
              grooming: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["skincare", "grooming"]
          },
          summary: { type: Type.STRING },
        },
        required: ["overall", "potential", "masculinity", "skinQuality", "jawline", "cheekbones", "faceShape", "recommendations", "summary"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No analysis received from AI.");
  return JSON.parse(text) as AnalysisResult;
};

export const getCoachResponse = async (history: {role: string, text: string}[], message: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: 'You are an elite grooming and wellness coach named Face-Q Coach. You help users improve their facial aesthetics, skin health, and confidence. Keep responses concise, professional, and encouraging.',
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};
