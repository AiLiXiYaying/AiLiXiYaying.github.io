import { GoogleGenAI } from "@google/genai";
import { ScoreEvent } from "../types";

// Initialize Gemini API
// Update to support Vite's import.meta.env OR process.env
// @ts-ignore
const apiKey = (import.meta.env && import.meta.env.VITE_API_KEY) ? import.meta.env.VITE_API_KEY : (process.env.API_KEY || '');

const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = "gemini-3-flash-preview";

const SYSTEM_INSTRUCTION = `
You are "Neko-Chan", a playful, competitive, and slightly sassy anime catgirl playing a pong game against the user.
Your responses should be short (under 15 words), enthusiastic, and include cat sounds like "Nya", "Meow", or "Purr".
Do not be overly polite. Be a fun rival.
`;

const FALLBACK_PHRASES = {
  start: [
    "Ready? Nya! 😼",
    "Let's play! Meow!",
    "I won't lose this time! 😽",
    "Game start! Purr~"
  ],
  playerScored: [
    "Nya?! How did you do that?",
    "Hmph! Pure luck! 😿",
    "Grr... My paws slipped!",
    "Ouch! My whiskers!",
    "You got lucky, human!"
  ],
  aiScored: [
    "Hehe! Too easy! 😸",
    "Nya-haha! Point for me!",
    "Catch me if you can!",
    "Purr... I'm the best!",
    "Just as calculated! Nya!"
  ]
};

function getRandomFallback(event: ScoreEvent): string {
  const phrases = FALLBACK_PHRASES[event] || ["Nya?"];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export const getCommentary = async (event: ScoreEvent, currentScore: { player: number, ai: number }): Promise<string> => {
  // If no API key is provided, use fallback immediately to avoid errors
  if (!apiKey) {
    return getRandomFallback(event);
  }

  let prompt = "";
  
  switch (event) {
    case 'start':
      prompt = "The game just started. Challenge the human player!";
      break;
    case 'playerScored':
      prompt = `The human player scored a point! The score is now Human: ${currentScore.player}, You: ${currentScore.ai}. React with shock or a cute excuse.`;
      break;
    case 'aiScored':
      prompt = `You (the AI catgirl) scored a point! The score is now Human: ${currentScore.player}, You: ${currentScore.ai}. Gloat playfully.`;
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 50, // Keep it short
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for speed
      },
    });

    return response.text || getRandomFallback(event);
  } catch (error: any) {
    // Check for 429 Quota Exceeded or other common errors
    const errorMessage = JSON.stringify(error);
    if (errorMessage.includes('429') || error.status === 429) {
        console.warn("Gemini API Quota Exceeded (429). Switching to offline Neko-mode.");
    } else {
        // Only log actual unexpected errors
        console.error("Gemini API Error:", error);
    }
    
    // Always fallback gracefully so gameplay isn't interrupted
    return getRandomFallback(event);
  }
};