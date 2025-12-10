import React, { useState } from 'react';
import { generateActionPlan, generateClarifyingQuestions } from '../services/geminiService';
import { ActionStep, AIPersona } from '../types';

interface CreateGoalProps {
  onPlanGenerated: (title: string, motivation: string, deadline: string, steps: ActionStep[]) => void;
  onCancel: () => void;
  aiPersona: AIPersona;
}

type Stage = 'INITIAL' | 'QUESTIONS' | 'GENERATING';

export const CreateGoal: React.FC<CreateGoalProps> = ({ onPlanGenerated, onCancel, aiPersona }) => {
  const [stage, setStage] = useState<Stage>('INITIAL');
  
  // Stage 1 State
  const [goal, setGoal] = useState('');
  const [motivation, setMotivation] = useState('');
  const [deadline, setDeadline] = useState('');

  // Stage 2 State
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || !motivation.trim() || !deadline) return;

    setLoading(true);
    setError(null);

    try {
      const generatedQuestions = await generateClarifyingQuestions(goal, motivation, aiPersona);
      setQuestions(generatedQuestions);
      setStage('QUESTIONS');
    } catch (err) {
      setError("We couldn't reach the AI coach right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStage('GENERATING');
    setLoading(true);
    
    // Format QA pairs
    const qaPairs = questions.map((q, idx) => ({
      question: q,
      answer: answers[idx] || "Not specified"
    }));

    try {
      const steps = await generateActionPlan(goal, motivation, deadline, qaPairs, aiPersona);
      onPlanGenerated(goal, motivation, deadline, steps);
    } catch (err) {
      setError("Failed to generate the final plan. Please try again.");
      setStage('QUESTIONS'); // Go back so they don't lose data
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({ ...prev, [index]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      
      {/* Header */}
      <div className="p-8 pb-0">
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {stage === 'INITIAL' ? 'New Ambition' : stage === 'QUESTIONS' ? 'Refining Your Plan' : 'Creating Plan'}
            </h2>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <i className="fa-solid fa-xmark text-xl"></i>
            </button>
        </div>
        <div className="flex space-x-2 mb-6">
            <div className={`h-1 flex-1 rounded-full ${stage === 'INITIAL' ? 'bg-indigo-600' : 'bg-indigo-200 dark:bg-indigo-900'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${stage === 'QUESTIONS' ? 'bg-indigo-600' : stage === 'GENERATING' ? 'bg-indigo-200 dark:bg-indigo-900' : 'bg-slate-100 dark:bg-slate-700'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${stage === 'GENERATING' ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-700'}`}></div>
        </div>
      </div>

      <div className="px-8 pb-8">
        {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-100 dark:border-red-800 flex items-center animate-fade-in">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                {error}
            </div>
        )}

        {/* STAGE 1: INITIAL INPUT */}
        {stage === 'INITIAL' && (
            <form onSubmit={handleInitialSubmit} className="space-y-6 animate-fade-in">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        What do you want to achieve?
                    </label>
                    <input
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g., Run a half-marathon, Learn React, Start a garden..."
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all placeholder:text-slate-400"
                        disabled={loading}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Why is this important to you?
                    </label>
                    <textarea
                        value={motivation}
                        onChange={(e) => setMotivation(e.target.value)}
                        placeholder="This will help the AI tailor the tone and urgency..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all placeholder:text-slate-400 resize-none"
                        disabled={loading}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Target Deadline
                    </label>
                    <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all"
                        disabled={loading}
                        required
                        min={new Date().toISOString().split('T')[0]}
                    />
                </div>

                <div className="pt-4 flex items-center justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-lg font-medium text-white shadow-md shadow-indigo-200 dark:shadow-none flex items-center
                            ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transform active:scale-95 transition-all'}`}
                    >
                        {loading ? (
                            <>
                                <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                                Consulting Coach...
                            </>
                        ) : (
                            <>
                                Next Step
                                <i className="fa-solid fa-arrow-right ml-2"></i>
                            </>
                        )}
                    </button>
                </div>
            </form>
        )}

        {/* STAGE 2: CLARIFYING QUESTIONS */}
        {stage === 'QUESTIONS' && (
             <form onSubmit={handleQuestionsSubmit} className="space-y-6 animate-fade-in">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-sm mb-6">
                    <i className="fa-solid fa-user-astronaut mr-2"></i>
                    To build the best plan for <strong>"{goal}"</strong>, I have a few quick questions.
                </div>

                <div className="space-y-6">
                    {questions.map((q, idx) => (
                        <div key={idx}>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {idx + 1}. {q}
                            </label>
                            <input
                                type="text"
                                value={answers[idx] || ''}
                                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all"
                                placeholder="Your answer..."
                                required
                            />
                        </div>
                    ))}
                </div>

                <div className="pt-6 flex items-center justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => setStage('INITIAL')}
                        className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                        disabled={loading}
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-lg font-medium text-white shadow-md shadow-indigo-200 dark:shadow-none flex items-center
                            ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transform active:scale-95 transition-all'}`}
                    >
                        Create Action Plan
                        <i className="fa-solid fa-wand-magic-sparkles ml-2"></i>
                    </button>
                </div>
            </form>
        )}

        {/* STAGE 3: GENERATING (LOADING) */}
        {stage === 'GENERATING' && (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Crafting your roadmap...</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-xs">
                    Analyzing your goal, motivation, and answers to structure the perfect path for you.
                </p>
            </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 text-center border-t border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-400">Powered by Gemini 2.5 • ActionPath AI</p>
      </div>
    </div>
  );
};