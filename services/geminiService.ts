import { ActionStep, Difficulty, Frequency, AIPersona, SubStep, Goal, ReviewResponse } from "../types";
import { auth } from "../firebaseConfig";

// Helper for local date
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get system instruction based on persona (client-side backup, but mainly passed to server)
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

const callGeminiApi = async (action: string, payload: any) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be logged in to use AI features.");
  }

  const token = await user.getIdToken();

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action, payload })
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized: Please log in again.");
    throw new Error(`AI Service Error: ${response.statusText}`);
  }

  return await response.json();
};

export const generateClarifyingQuestions = async (goal: string, motivation: string, persona: AIPersona): Promise<string[]> => {
  try {
    const systemInstruction = getSystemInstruction(persona);
    return await callGeminiApi('generateClarifyingQuestions', { goal, motivation, systemInstruction });
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
    const today = getLocalDate();
    const systemInstruction = getSystemInstruction(persona);

    return await callGeminiApi('generateActionPlan', {
      goal, motivation, deadline, qaHistory, today, systemInstruction
    });

  } catch (error) {
    console.error("Error generating plan:", error);
    throw new Error("Failed to generate an action plan. Please try again.");
  }
};

export const generateMoreSteps = async (goal: string, motivation: string, existingSteps: ActionStep[], persona: AIPersona): Promise<ActionStep[]> => {
  try {
    const existingTitles = existingSteps.map(s => `${s.title} (${s.frequency})`).join(", ");
    const today = getLocalDate();
    const systemInstruction = getSystemInstruction(persona);

    return await callGeminiApi('generateMoreSteps', {
      goal, motivation, existingTitles, today, systemInstruction
    });

  } catch (error) {
    console.error("Error generating more steps:", error);
    throw new Error("Failed to generate more steps. Please try again.");
  }
};

export const generateSubSteps = async (stepTitle: string, stepDescription: string, goalTitle: string, persona: AIPersona): Promise<SubStep[]> => {
  try {
    const systemInstruction = getSystemInstruction(persona);
    return await callGeminiApi('generateSubSteps', {
      goalTitle, stepTitle, stepDescription, systemInstruction
    });
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
    const today = getLocalDate();
    const systemInstruction = getSystemInstruction(persona);

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

    return await callGeminiApi('generateWeeklyReview', {
      goalTitle: goal.title, reflection, mood, simplifiedSteps, today, systemInstruction, persona
    });

  } catch (error) {
    console.error("Error generating weekly review:", error);
    throw new Error("Failed to generate weekly review.");
  }
};