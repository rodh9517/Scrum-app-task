
import { GoogleGenAI, Type } from "@google/genai";
import { Project, User, Task, TaskStatus, TaskPriority, TaskDuration } from "../types";
import { PRIORITY_WEIGHTS, DURATION_WEIGHTS } from "../constants";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateSubtasks = async (title: string, description: string, projectDescription?: string): Promise<string[]> => {
  if (!API_KEY) {
    // Simulate a delay and return mock data if API key is not available
    await new Promise(resolve => setTimeout(resolve, 1000));
    return ["Simulado: Analizar requisitos", "Simulado: Crear estructura de componentes", "Simulado: Escribir pruebas unitarias"];
  }

  try {
    const contextPrompt = projectDescription 
        ? `Contexto del Proyecto: "${projectDescription}".\n` 
        : "";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Eres un experto gestor de proyectos. ${contextPrompt}Basado en la siguiente tarea, genera una lista de 3 a 5 subtareas procesables, técnicas y específicas.
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

    const jsonText = response.text?.trim();
    if (!jsonText) return [];
    const result = JSON.parse(jsonText);
    return result.subtasks || [];

  } catch (error) {
    console.error("Error generating subtasks with Gemini:", error);
    // Fallback to mock data in case of an API error
    return ["Error: No se pudieron generar las subtareas", "Por favor, revisa la clave de API o la red", "Inténtalo de nuevo más tarde"];
  }
};

interface VoiceParsedData {
    title: string;
    description: string;
    projectId: string | null;
    responsibleId: string | null;
}

export const parseTaskFromVoice = async (transcript: string, projects: Project[], users: User[]): Promise<VoiceParsedData> => {
  // Fallback if no API key is present
  if (!API_KEY) {
    return { 
        title: transcript, 
        description: "Creada por voz (Sin IA)",
        projectId: null, 
        responsibleId: null 
    };
  }

  try {
    // Prepare context for the AI
    const projectContext = projects.map(p => `ID: ${p.id}, Nombre: "${p.name}", Desc: "${p.description || ''}"`).join('\n');
    const userContext = users.map(u => `ID: ${u.id}, Nombre: "${u.name}"`).join('\n');

    const prompt = `
      Actúa como un asistente de gestión de proyectos inteligente.
      Analiza el siguiente comando de voz para crear una nueva tarea.
      
      COMANDO DE VOZ: "${transcript}"
      
      CONTEXTO DE PROYECTOS DISPONIBLES:
      ${projectContext}
      
      CONTEXTO DE USUARIOS DISPONIBLES:
      ${userContext}
      
      INSTRUCCIONES:
      1. Extrae un Título claro y conciso.
      2. Genera una Descripción profesional basada en el comando y, si detectas el proyecto, usa la descripción del proyecto para darle contexto técnico.
      3. Intenta coincidir el proyecto mencionado con la lista de IDs. Si no se menciona o es ambiguo, devuelve null.
      4. Intenta coincidir el responsable mencionado con la lista de IDs. Si no se menciona, devuelve null.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título corto de la tarea" },
            description: { type: Type.STRING, description: "Descripción detallada y profesional generada" },
            projectId: { type: Type.STRING, description: "ID del proyecto coincidente o null", nullable: true },
            responsibleId: { type: Type.STRING, description: "ID del usuario responsable o null", nullable: true }
          }
        }
      }
    });

    const jsonText = response.text?.trim();
    if (!jsonText) throw new Error("Empty response from AI");
    
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Error parsing voice command with Gemini:", error);
    // Fallback in case of error
    return { 
        title: transcript, 
        description: "Creada por voz (Error de procesamiento IA)", 
        projectId: null, 
        responsibleId: null 
    };
  }
};

// --- NEW MODULE: AI PERFORMANCE ANALYSIS ---

export const generatePerformanceAnalysis = async (
    tasks: Task[], 
    users: User[], 
    startDate: string, 
    endDate: string
): Promise<string> => {
    if (!API_KEY) {
        return "<p>API Key no configurada. No se puede generar el análisis.</p>";
    }

    try {
        // 1. Filter Data by Date Range
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Include the end date fully
        end.setHours(23, 59, 59, 999);

        const tasksInRange = tasks.filter(t => {
            // Use completedAt for done tasks, createdAt for others to check activity overlap
            const dateToCheck = t.completedAt ? new Date(t.completedAt) : new Date(t.createdAt);
            return dateToCheck >= start && dateToCheck <= end;
        });

        // 2. Pre-calculate Metrics (Hard Data for the AI)
        const userPerformance = users.map(user => {
            const userTasks = tasksInRange.filter(t => t.responsibleId === user.id);
            const completed = userTasks.filter(t => t.status === TaskStatus.Done);
            const pending = userTasks.filter(t => t.status !== TaskStatus.Done);
            
            // Calculate Weighted Score
            // Score = Sum(PriorityWeight + DurationWeight) for completed tasks
            const score = completed.reduce((acc, t) => {
                const pWeight = PRIORITY_WEIGHTS[t.priority || 'Baja'];
                const dWeight = DURATION_WEIGHTS[t.duration || '1 día'];
                return acc + pWeight + dWeight;
            }, 0);

            // Calculate "Load" (Weighted Score of Pending Tasks)
            const pendingLoad = pending.reduce((acc, t) => {
                const pWeight = PRIORITY_WEIGHTS[t.priority || 'Baja'];
                const dWeight = DURATION_WEIGHTS[t.duration || '1 día'];
                return acc + pWeight + dWeight;
            }, 0);

            return {
                name: user.name,
                completedCount: completed.length,
                pendingCount: pending.length,
                performanceScore: score, // High is good (output)
                pendingLoad: pendingLoad, // High might mean bottleneck
                mostComplexTask: completed.sort((a,b) => 
                    (PRIORITY_WEIGHTS[b.priority||'Baja'] + DURATION_WEIGHTS[b.duration||'1 día']) - 
                    (PRIORITY_WEIGHTS[a.priority||'Baja'] + DURATION_WEIGHTS[a.duration||'1 día'])
                )[0]?.title || "Ninguna"
            };
        });

        const totalScore = userPerformance.reduce((acc, u) => acc + u.performanceScore, 0);

        // 3. Construct Prompt
        const dataSummary = JSON.stringify(userPerformance, null, 2);
        
        const prompt = `
            Actúa como un Gerente de Proyecto Senior y Analista de Datos.
            He calculado el rendimiento del equipo basado en un sistema de ponderación personalizado.
            
            PERIODO: ${startDate} a ${endDate}
            
            SISTEMA DE PONDERACIÓN:
            - Las tareas tienen Prioridad (Baja=5 a Urgente=40) y Duración Estimada (1 día=5 a 2 semanas=20).
            - "Performance Score" es la suma de pesos de las tareas COMPLETADAS (Mayor es mejor).
            - "Pending Load" es la suma de pesos de tareas PENDIENTES.

            DATOS DEL EQUIPO:
            ${dataSummary}

            DATOS TOTALES DEL CICLO:
            Puntos Totales Producidos: ${totalScore}

            INSTRUCCIONES:
            Genera un reporte ejecutivo en formato HTML (sin markdown blocks, solo las etiquetas html internas) con clases de Tailwind CSS.
            El reporte debe ser visualmente atractivo, profesional y directo.
            
            ESTRUCTURA DEL REPORTE:
            1. **Resumen Ejecutivo**: Un párrafo breve sobre la productividad general del ciclo.
            2. **Estrella del Ciclo**: Destaca al usuario con mayor Performance Score. Usa un icono o emoji.
            3. **Análisis Individual**: Breve comentario sobre cada usuario (Fortalezas o Cuellos de botella si tienen mucha carga pendiente).
            4. **Recomendaciones**: 2 o 3 acciones sugeridas para el próximo ciclo basadas en la carga pendiente.

            ESTILO:
            - Usa <div class="bg-white p-4 rounded shadow-sm border-l-4 border-blue-500 mb-4"> para las tarjetas.
            - Usa <h3 class="font-bold text-lg text-gray-800"> para títulos.
            - Usa <span class="font-bold text-green-600"> para métricas positivas.
            - Usa <span class="font-bold text-red-500"> para alertas de carga alta.
            - No incluyas <html>, <head> o <body>, solo el contenido del reporte.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text || "<p>No se pudo generar el análisis.</p>";

    } catch (error) {
        console.error("Error generating performance analysis:", error);
        return `<div class="p-4 bg-red-50 text-red-700 rounded">Error al generar el reporte: ${(error as Error).message}</div>`;
    }
};
