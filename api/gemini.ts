import { GoogleGenAI, Type } from "@google/genai";
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
    }
}

export default async function handler(req, res) {
    // 1. Method check
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Auth Verification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // 3. API Key Check
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Server Configuration Error: Missing GEMINI_API_KEY');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // 4. Action Handling
    const { action, payload } = req.body;
    const ai = new GoogleGenAI({ apiKey });

    try {
        let result;

        if (action === 'generateClarifyingQuestions') {
            const { goal, motivation, systemInstruction } = payload;
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
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        description: "A list of clarifying questions.",
                        items: { type: Type.STRING },
                    },
                },
            });
            result = JSON.parse(response.text || "[]");

        } else if (action === 'generateActionPlan') {
            const { goal, motivation, deadline, qaHistory, today, systemInstruction } = payload;
            const qaContext = qaHistory.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n");

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
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        description: "A list of actionable steps to achieve the goal.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "A short, punchy title for the action step." },
                                description: { type: Type.STRING, description: "A 1-sentence explanation of how to do it." },
                                estimatedTime: { type: Type.STRING, description: "Estimated time to complete (e.g., '15 mins', '1 hour')." },
                                difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"], description: "The difficulty level of the task." },
                                frequency: { type: Type.STRING, enum: ["Once", "Daily", "Weekly", "Monthly"], description: "How often this task should be performed." },
                                deadline: { type: Type.STRING, description: "Recommended deadline for this specific step in YYYY-MM-DD format." }
                            },
                            required: ["title", "description", "estimatedTime", "difficulty", "frequency", "deadline"],
                        },
                    },
                },
            });
            result = JSON.parse(response.text || "[]");

        } else if (action === 'generateMoreSteps') {
            const { goal, motivation, existingTitles, today, systemInstruction } = payload;
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
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        description: "A list of additional actionable steps.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "A short, punchy title for the action step." },
                                description: { type: Type.STRING, description: "A 1-sentence explanation of how to do it." },
                                estimatedTime: { type: Type.STRING, description: "Estimated time to complete (e.g., '15 mins', '1 hour')." },
                                difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"], description: "The difficulty level of the task." },
                                frequency: { type: Type.STRING, enum: ["Once", "Daily", "Weekly", "Monthly"], description: "How often this task should be performed." },
                                deadline: { type: Type.STRING, description: "Recommended deadline in YYYY-MM-DD format." }
                            },
                            required: ["title", "description", "estimatedTime", "difficulty", "frequency", "deadline"],
                        },
                    },
                },
            });
            result = JSON.parse(response.text || "[]");

        } else if (action === 'generateSubSteps') {
            const { goalTitle, stepTitle, stepDescription, systemInstruction } = payload;
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
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        description: "A list of micro-steps.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "A very short, atomic action title." }
                            },
                            required: ["title"],
                        },
                    },
                },
            });
            result = JSON.parse(response.text || "[]");

        } else if (action === 'generateWeeklyReview') {
            const { goalTitle, reflection, mood, simplifiedSteps, today, systemInstruction, persona } = payload;
            const prompt = `
                Current Date: ${today}
                User Goal: "${goalTitle}"
                
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
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        description: "Weekly review analysis and plan updates.",
                        properties: {
                            analysis: { type: Type.STRING, description: "The coach's feedback to the user." },
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
            result = JSON.parse(response.text || "{}");

        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        res.status(200).json(result);

    } catch (error) {
        console.error('Gemini API/Processing Error:', error);
        res.status(500).json({ error: 'Failed to generate content' });
    }
}
