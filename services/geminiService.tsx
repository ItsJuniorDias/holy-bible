import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the SDK with your API key from .env
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

export const askMentor = async (
  userQuestion,
  verseContext,
  currentTranslation,
) => {
  try {
    // We recommend using the 'flash' model for fast responses in mobile apps
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // System Prompt (kept in Portuguese so the AI replies in Portuguese to the user)
    const prompt =
      currentTranslation === "almeida"
        ? `
      Você é um Mentor Exegético de um aplicativo da Bíblia.
      Responda de forma acolhedora, com base histórica e cultural.
      
      Versículo em questão: "${verseContext}"
      Dúvida do usuário: "${userQuestion}"
    `
        : `
      You are an Exegetical Mentor for a Bible app.
      Answer in a warm, historically and culturally informed manner.
      
      Verse in question: "${verseContext}"
      User's question: "${userQuestion}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error fetching data from Gemini:", error);
    return "Sorry, the Mentor is unavailable right now. Please try again later.";
  }
};
