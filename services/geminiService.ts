import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MCQ, ImageSize } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to shuffle array (Fisher-Yates)
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- MCQ GENERATION ---

export const generateMCQs = async (
  content: string,
  questionCount: number,
  isFile: boolean = false,
  mimeType?: string,
  difficultyLevel: string = "Mixed"
): Promise<MCQ[]> => {
  try {
    const parts: any[] = [];
    
    let difficultyInstruction = "";
    if (isFile) {
        difficultyInstruction = "Analyze the provided document's educational level, tone, and complexity. Generate MCQs that strictly match the difficulty and teaching method found in the material.";
    } else {
        if (difficultyLevel === "Mixed") {
            difficultyInstruction = "Include a balanced mix of Easy, Medium, and Hard questions.";
        } else {
            difficultyInstruction = `All questions must be of ${difficultyLevel} difficulty.`;
        }
    }

    // System instruction for the generator
    const promptText = `
    Build an app that generates ONLY Multiple-Choice Questions (MCQs) based on either:
    1. Uploaded course materials (PDF, DOCX, PPTX, or pasted text), or
    2. User-entered topics.

    YOUR JOB:
    From the user's provided material or topic, create exactly ${questionCount} high-quality MCQs.
    
    CRITICAL INSTRUCTIONS FOR DEEP DOCUMENT SCANNING:
    1. **Complete Analysis**: You MUST read and analyze the ENTIRE document content thoroughly, from the very first sentence to the very last. Do not skim or rely on summaries.
    2. **Even Distribution**: Ensure the ${questionCount} questions are distributed evenly across the ENTIRE length of the text. Questions must be generated from the beginning, middle, and end sections equally.
    3. **All Sections Covered**: If the document has multiple chapters, headers, or distinct sections, ensure that questions are generated from EVERY section.
    4. **Deep Detail Extraction**: Avoid generic questions. Extract specific details, figures, definitions, and nuanced points found deep within the text.
    5. **No Bias**: Do not bias questions towards the introduction or conclusion. The middle content is just as important.
    
    Additional Rules:
    - Questions must be strictly based on the content provided.
    - Avoid repetition.
    - Do NOT add external facts.
    - ${difficultyInstruction}
    - Randomize the order of concepts tested to ensure variety in the output (though cover the whole doc).
    
    MCQ OUTPUT FORMAT (JSON ONLY):
    [{
     "id": number,
     "difficulty": "Easy | Medium | Hard",
     "question": "text",
     "options": { "A": "", "B": "", "C": "", "D": "" },
     "answer": "A/B/C/D"
    }]
    `;

    if (isFile && mimeType) {
      // Content is base64 string
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: content
        }
      });
      // Include the instructions alongside the document
      parts.push({ text: `Generate ${questionCount} MCQs based on this document.\n\n${promptText}` });
    } else {
      parts.push({ text: `Topic/Content: ${content}\n\n${promptText}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Updated to Gemini 3 for superior reasoning
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
              question: { type: Type.STRING },
              options: {
                type: Type.OBJECT,
                properties: {
                  A: { type: Type.STRING },
                  B: { type: Type.STRING },
                  C: { type: Type.STRING },
                  D: { type: Type.STRING },
                },
                required: ["A", "B", "C", "D"]
              },
              answer: { type: Type.STRING, enum: ["A", "B", "C", "D"] }
            },
            required: ["id", "difficulty", "question", "options", "answer"]
          }
        }
      }
    });

    if (response.text) {
      const questions = JSON.parse(response.text) as MCQ[];
      // Shuffle the questions to ensure dynamic ordering each time
      return shuffleArray(questions);
    }
    return [];
  } catch (error) {
    console.error("MCQ Gen Error:", error);
    throw error;
  }
};

// --- CHAT ---

export const sendChatMessage = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
    const chat = ai.chats.create({
        model: 'gemini-3-pro-preview', // Updated to Gemini 3 for better tutoring
        history: history,
    });
    
    const result = await chat.sendMessage({ message });
    return result.text;
};

// --- IMAGE GENERATION (Disabled) ---
// Function removed to prevent 403 errors with standard keys
export const generateImage = async (prompt: string, size: ImageSize): Promise<string | null> => {
    return null;
};

// --- TEXT TO SPEECH ---

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};