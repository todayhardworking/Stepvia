import { GoogleGenAI, Type } from "@google/genai";
import { ActionStep, Difficulty, Frequency, AIPersona, SubStep, Goal, ReviewResponse } from "../types";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper for local date
const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to get system instruction based on persona
const getSystemInstruction = (persona: AIPersona): string => {
  switch (persona) {
    case AIPersona.DRILL_SERGEANT:
      return "You are a strict, no-nonsense, hard-driving productivity coach. You demand excellence, brevity, and immediate action. Do not sugarcoat things.";
    case AIPersona.ANALYTICAL:
      return "You are a logical, data-driven, and highly efficient productivity strategist. Focus on optimization, clear metrics, and logical progression. Avoid emotional fluff.";
    case AIPersona.MOTIVATIONAL:
    default:
      return "You are a helpful, encouraging, and highly organized productivity coach. You focus on positive reinforcement and manageable steps.";
  }
};

export const generateClarifyingQuestions = async (goal: string, motivation: string, persona: AIPersona): Promise<string[]> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        User Goal: "${goal}"
        User Motivation: "${motivation}"
  
        You are an expert productivity coach. To create a truly effective action plan, you need to understand the user's context better.
        Generate 3 to 5 short, specific, and crucial clarifying questions to ask the user.
        Focus on constraints, resources, current skill level, or specific preferences.
      `;
  
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: getSystemInstruction(persona),
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "A list of clarifying questions.",
            items: {
              type: Type.STRING,
            },
          },
        },
      });
  
      const questions = JSON.parse(response.text || "[]");
      return questions;
  
    } catch (error) {
      console.error("Error generating questions:", error);
      return [
        "What is your biggest obstacle right now?",
        "How much time can you dedicate to this per week?",
        "What specifically does 'success' look like for you?"
      ];
    }
  };

export const generateActionPlan = async (
  goal: string, 
  motivation: string, 
  deadline: string,
  qaHistory: { question: string; answer: string }[],
  persona: AIPersona
): Promise<ActionStep[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const qaContext = qaHistory.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n");
    const today = getLocalDate();

    const prompt = `
      Current Date: ${today}
      User Goal: "${goal}"
      User Motivation: "${motivation}"
      Target Deadline: "${deadline}"

      Context from User:
      ${qaContext}

      Break this goal down into 5 to 8 concrete, actionable, and sequential steps. 
      The steps should be practical and help the user get started immediately.
      
      IMPORTANT: 
      1. Assign a specific deadline (YYYY-MM-DD) to each step. Deadlines should be sequential.
      2. Assign a FREQUENCY to each step: 'Once', 'Daily', 'Weekly', or 'Monthly'. 
         - Use 'Once' for setup tasks or milestones.
         - Use 'Daily', 'Weekly', etc. for habits or recurring practice.
      
      Ensure the pacing is realistic given the estimated time.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(persona),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "A list of actionable steps to achieve the goal.",
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "A short, punchy title for the action step.",
              },
              description: {
                type: Type.STRING,
                description: "A 1-sentence explanation of how to do it.",
              },
              estimatedTime: {
                type: Type.STRING,
                description: "Estimated time to complete (e.g., '15 mins', '1 hour').",
              },
              difficulty: {
                type: Type.STRING,
                enum: ["Easy", "Medium", "Hard"],
                description: "The difficulty level of the task.",
              },
              frequency: {
                type: Type.STRING,
                enum: ["Once", "Daily", "Weekly", "Monthly"],
                description: "How often this task should be performed.",
              },
              deadline: {
                type: Type.STRING,
                description: "Recommended deadline for this specific step in YYYY-MM-DD format.",
              }
            },
            required: ["title", "description", "estimatedTime", "difficulty", "frequency", "deadline"],
          },
        },
      },
    });

    const rawSteps = JSON.parse(response.text || "[]");

    // Map response to our internal type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps: ActionStep[] = rawSteps.map((step: any) => ({
      id: generateId(),
      title: step.title,
      description: step.description,
      estimatedTime: step.estimatedTime,
      difficulty: step.difficulty as Difficulty,
      frequency: (step.frequency as Frequency) || Frequency.ONCE,
      isCompleted: false,
      checkIns: [],
      deadline: step.deadline
    }));

    return steps;

  } catch (error) {
    console.error("Error generating plan:", error);
    throw new Error("Failed to generate an action plan. Please try again.");
  }
};

export const generateMoreSteps = async (goal: string, motivation: string, existingSteps: ActionStep[], persona: AIPersona): Promise<ActionStep[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const existingTitles = existingSteps.map(s => `${s.title} (${s.frequency})`).join(", ");
    const today = getLocalDate();

    const prompt = `
      Current Date: ${today}
      User Goal: "${goal}"
      User Motivation: "${motivation}"
      
      The user already has the following steps in their plan:
      ${existingTitles}

      Please generate 3 to 5 *additional* concrete, actionable steps to continue this plan or fill in gaps.
      Do not repeat existing steps.
      Assign appropriate frequency (Once, Daily, Weekly, Monthly) to new steps.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(persona),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "A list of additional actionable steps.",
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "A short, punchy title for the action step.",
              },
              description: {
                type: Type.STRING,
                description: "A 1-sentence explanation of how to do it.",
              },
              estimatedTime: {
                type: Type.STRING,
                description: "Estimated time to complete (e.g., '15 mins', '1 hour').",
              },
              difficulty: {
                type: Type.STRING,
                enum: ["Easy", "Medium", "Hard"],
                description: "The difficulty level of the task.",
              },
              frequency: {
                type: Type.STRING,
                enum: ["Once", "Daily", "Weekly", "Monthly"],
                description: "How often this task should be performed.",
              },
              deadline: {
                type: Type.STRING,
                description: "Recommended deadline in YYYY-MM-DD format.",
              }
            },
            required: ["title", "description", "estimatedTime", "difficulty", "frequency", "deadline"],
          },
        },
      },
    });

    const rawSteps = JSON.parse(response.text || "[]");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps: ActionStep[] = rawSteps.map((step: any) => ({
      id: generateId(),
      title: step.title,
      description: step.description,
      estimatedTime: step.estimatedTime,
      difficulty: step.difficulty as Difficulty,
      frequency: (step.frequency as Frequency) || Frequency.ONCE,
      isCompleted: false,
      checkIns: [],
      deadline: step.deadline
    }));

    return steps;

  } catch (error) {
    console.error("Error generating more steps:", error);
    throw new Error("Failed to generate more steps. Please try again.");
  }
};

export const generateSubSteps = async (stepTitle: string, stepDescription: string, goalTitle: string, persona: AIPersona): Promise<SubStep[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Goal: "${goalTitle}"
      Parent Task: "${stepTitle}"
      Task Description: "${stepDescription}"
      
      The user is finding this specific task a bit overwhelming or vague.
      Break this SINGLE parent task down into 3 to 5 "micro-steps". 
      These should be atomic, extremely concrete actions that can be done in 5-10 minutes each.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(persona),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "A list of micro-steps.",
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "A very short, atomic action title.",
              }
            },
            required: ["title"],
          },
        },
      },
    });

    const rawSteps = JSON.parse(response.text || "[]");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subSteps: SubStep[] = rawSteps.map((s: any) => ({
      id: generateId(),
      title: s.title,
      isCompleted: false
    }));

    return subSteps;

  } catch (error) {
    console.error("Error generating sub-steps:", error);
    throw new Error("Failed to break down the task.");
  }
};

export const generateWeeklyReview = async (
    goal: Goal,
    reflection: string,
    mood: number, // 1-5
    persona: AIPersona
): Promise<ReviewResponse> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const today = getLocalDate();

        // Simplify goal steps for the prompt context to save tokens/complexity
        const simplifiedSteps = goal.steps.map(s => ({
            id: s.id,
            title: s.title,
            deadline: s.deadline,
            frequency: s.frequency,
            isCompleted: s.isCompleted,
            checkInsCount: s.checkIns?.length || 0,
            lastCheckIn: s.checkIns?.length ? s.checkIns[s.checkIns.length - 1] : 'Never'
        }));

        const prompt = `
            Current Date: ${today}
            User Goal: "${goal.title}"
            
            Context:
            The user is doing a Weekly Review.
            User Reflection: "${reflection}"
            Self-Reported Mood/Satisfaction (1-5): ${mood}/5

            Plan Status:
            ${JSON.stringify(simplifiedSteps, null, 2)}

            Task:
            1. Analyze the user's progress. Be specific about what they did well and what they missed.
               Adopt the persona of a ${persona} coach.
            2. Suggest specific modifications to the plan to help them get back on track or maintain momentum.
               - IF tasks are overdue (deadline passed and not completed), reschedule them to a future date starting from tomorrow.
               - IF the user is overwhelmed (low mood, missed many tasks), suggest setting deadlines further apart or simplifying descriptions.
               - IF the user is crushing it, maybe add a challenging new step.
               - DO NOT modify tasks that are already completed.

            Return JSON format.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: getSystemInstruction(persona),
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    description: "Weekly review analysis and plan updates.",
                    properties: {
                        analysis: {
                            type: Type.STRING,
                            description: "The coach's feedback to the user.",
                        },
                        modifications: {
                            type: Type.ARRAY,
                            description: "List of existing steps to update (e.g. reschedule).",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    stepId: { type: Type.STRING, description: "The ID of the step to modify." },
                                    changes: {
                                        type: Type.OBJECT,
                                        properties: {
                                            deadline: { type: Type.STRING },
                                            title: { type: Type.STRING },
                                            description: { type: Type.STRING },
                                            difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] }
                                        }
                                    }
                                },
                                required: ["stepId", "changes"]
                            }
                        },
                        newSteps: {
                            type: Type.ARRAY,
                            description: "List of completely new steps to add.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    estimatedTime: { type: Type.STRING },
                                    difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
                                    frequency: { type: Type.STRING, enum: ["Once", "Daily", "Weekly", "Monthly"] },
                                    deadline: { type: Type.STRING }
                                },
                                required: ["title", "description", "estimatedTime", "difficulty", "frequency", "deadline"]
                            }
                        }
                    },
                    required: ["analysis", "modifications", "newSteps"]
                }
            }
        });

        const result = JSON.parse(response.text || "{}");
        
        // Sanitize new steps with IDs
        const newStepsWithIds: ActionStep[] = (result.newSteps || []).map((s: any) => ({
            id: generateId(),
            title: s.title,
            description: s.description,
            estimatedTime: s.estimatedTime,
            difficulty: s.difficulty as Difficulty,
            frequency: (s.frequency as Frequency) || Frequency.ONCE,
            deadline: s.deadline,
            isCompleted: false,
            checkIns: [],
            subSteps: []
        }));

        return {
            analysis: result.analysis || "Keep going!",
            modifications: result.modifications || [],
            newSteps: newStepsWithIds
        };

    } catch (error) {
        console.error("Error generating weekly review:", error);
        throw new Error("Failed to generate weekly review.");
    }
};