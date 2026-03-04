import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const API_KEY = process.env.API_KEY || '';

/** Clamp a score to 1-100 and round. Handles NaN/undefined. */
function clampScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.round(Math.min(100, Math.max(1, n)));
}

/** Apply 1-100 clamping to all numeric score fields. */
function clampScores(raw: Record<string, unknown>): AnalysisResult {
  return {
    overall: clampScore(raw.overall),
    potential: clampScore(raw.potential),
    masculinity: clampScore(raw.masculinity),
    skinQuality: clampScore(raw.skinQuality),
    jawline: clampScore(raw.jawline),
    cheekbones: clampScore(raw.cheekbones),
    faceShape: typeof raw.faceShape === 'string' ? raw.faceShape : 'Unknown',
    recommendations: {
      skincare: Array.isArray(raw.recommendations?.skincare) ? (raw.recommendations as { skincare: string[] }).skincare : [],
      grooming: Array.isArray(raw.recommendations?.grooming) ? (raw.recommendations as { grooming: string[] }).grooming : [],
    },
    summary: typeof raw.summary === 'string' ? raw.summary : '',
  };
}

const SCORING_PROMPT = `You are analyzing facial aesthetics from portrait photos.

**Step 1 – Face check (required):** Look at the image(s). Determine if the first image shows a single, clear, visible human face (front portrait). If the image shows anything other than a human face — e.g. a screen, phone/device, object, animal, landscape, text, no face, or multiple faces — set isHumanFace to false and set rejectionReason to a short, user-friendly message (e.g. "Please upload a clear photo of your face." or "This doesn't look like a face photo."). Do not assign real scores when isHumanFace is false; use 0 for all numeric fields and empty arrays and empty string for recommendations/summary/faceShape.

**Step 2 – Scoring (only when isHumanFace is true):** Score each metric from 1 to 100. Use the definitions below.

**Metrics (all 1-100):**
- **overall**: Combined facial attractiveness and balance from both views (symmetry, proportions, clarity of features).
- **potential**: How much improvement is realistically attainable with grooming, skincare, and style (higher = more room to improve in a good way).
- **masculinity**: Masculine trait prominence (jaw, brow ridge, facial structure) as typically perceived; score neutrally.
- **skinQuality**: Skin clarity, evenness, and apparent health (blemishes, texture, tone).
- **jawline**: Definition and prominence of the jaw from front and profile (contour, chin, angle).
- **cheekbones**: Prominence and placement of cheekbones (structure, definition).

**Input:** The first image is a front-facing portrait; the second image (if provided) is a side profile. Use both views when available to assess jawline, profile, and overall structure.

**Recommendations (score-based, only when isHumanFace is true):** After scoring, provide a short "daily routine" list. Base recommendations on the scores: prioritize areas that scored lower (e.g. if skinQuality is low, add skincare steps; if jawline is low, add grooming/styling tips). Give 2-4 concrete, actionable items: 1-2 in skincare (short phrases like "Start a skincare routine" or "Focus on blemish care") and 1-2 in grooming (e.g. "Groom your eyebrows", "Improve your hair"). Each string should be a single clear action the user can take.

Output strict JSON only. Always include: isHumanFace (boolean), rejectionReason (string; use "" when isHumanFace is true), overall, potential, masculinity, skinQuality, jawline, cheekbones (all numbers 1-100), faceShape (e.g. oval, round, square, diamond, oblong), recommendations (object with arrays: skincare, grooming — each 1-2 short strings), and summary (short string).`;

export const analyzeFaceImage = async (
  frontImageDataUrl: string,
  sideImageDataUrl?: string | null
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

  const frontB64 = frontImageDataUrl.includes(',') ? frontImageDataUrl.split(',')[1] : frontImageDataUrl;
  parts.push({
    inlineData: { mimeType: 'image/jpeg', data: frontB64 },
  });

  if (sideImageDataUrl?.includes(',')) {
    const sideB64 = sideImageDataUrl.split(',')[1];
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: sideB64 },
    });
  }

  parts.push({ text: SCORING_PROMPT });

  let response;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isHumanFace: { type: Type.BOOLEAN },
            rejectionReason: { type: Type.STRING },
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
          required: ["isHumanFace", "rejectionReason", "overall", "potential", "masculinity", "skinQuality", "jawline", "cheekbones", "faceShape", "recommendations", "summary"],
        },
      },
    });
  } catch (apiErr: unknown) {
    const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
    if (
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      (msg.includes('"code":') && msg.includes('"status":'))
    ) {
      throw new Error('Analysis is busy right now. Please try again in a minute.');
    }
    if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
      throw new Error('Analysis is temporarily unavailable. Please try again in a minute.');
    }
    if (msg.includes('401') || msg.includes('403') || msg.includes('API key')) {
      throw new Error('Analysis is not available. Please try again later.');
    }
    if (msg.length > 120 || msg.trim().startsWith('{')) {
      throw new Error('Something went wrong. Please try again.');
    }
    throw apiErr;
  }

  const text = response.text;
  if (!text) throw new Error("No analysis received from AI.");
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (raw.isHumanFace === false) {
    const reason = typeof raw.rejectionReason === 'string' && raw.rejectionReason.trim()
      ? raw.rejectionReason.trim()
      : 'Please upload a clear photo of your face.';
    throw new Error(reason);
  }
  return clampScores(raw);
};

const COACH_SYSTEM =
  'You are Looks IQ Coach, a friendly and knowledgeable personal coach. You help users with: improving their overall look and confidence, gaining more muscle, losing body fat, getting clear skin, and sharpening their jawline. Give practical, encouraging, and concise advice. Keep responses conversational and easy to read (short paragraphs or bullet points when helpful).';

export const getCoachResponse = async (history: { role: string; text: string }[], message: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: COACH_SYSTEM,
    },
  });

  let messageToSend = message;
  if (history.length > 0) {
    const historyBlob = history
      .map((m) => (m.role === 'user' ? `User: ${m.text}` : `Coach: ${m.text}`))
      .join('\n\n');
    messageToSend = `[Previous conversation]\n\n${historyBlob}\n\nUser: ${message}`;
  }

  const response = await chat.sendMessage({ message: messageToSend });
  return response.text ?? null;
};
