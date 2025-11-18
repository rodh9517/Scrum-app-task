import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateSubtasks = async (title: string, description: string): Promise<string[]> => {
  if (!API_KEY) {
    // Simulate a delay and return mock data if API key is not available
    await new Promise(resolve => setTimeout(resolve, 1000));
    return ["Simulado: Analizar requisitos", "Simulado: Crear estructura de componentes", "Simulado: Escribir pruebas unitarias"];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Basado en la siguiente tarea, genera una lista de 3 a 5 subtareas procesables.
      Título de la Tarea: "${title}"
      Descripción de la Tarea: "${description}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: 'An actionable subtask.'
              }
            }
          }
        }
      }
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.subtasks || [];

  } catch (error) {
    console.error("Error generating subtasks with Gemini:", error);
    // Fallback to mock data in case of an API error
    return ["Error: No se pudieron generar las subtareas", "Por favor, revisa la clave de API o la red", "Inténtalo de nuevo más tarde"];
  }
};