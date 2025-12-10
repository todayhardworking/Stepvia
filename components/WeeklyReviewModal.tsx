import React, { useState } from 'react';
import { AIPersona, Goal, ReviewResponse } from '../types';
import { generateWeeklyReview } from '../services/geminiService';

interface WeeklyReviewModalProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
  onApply: (response: ReviewResponse) => void;
  aiPersona: AIPersona;
}

export const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({ 
    goal, isOpen, onClose, onApply, aiPersona 
}) => {
  const [step, setStep] = useState<'REFLECTION' | 'LOADING' | 'RESULTS'>('REFLECTION');
  const [reflection, setReflection] = useState('');
  const [mood, setMood] = useState<number>(3); // 1-5
  const [reviewResult, setReviewResult] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!reflection.trim()) return;
    setStep('LOADING');
    setError(null);
    try {
        const result = await generateWeeklyReview(goal, reflection, mood, aiPersona);
        setReviewResult(result);
        setStep('RESULTS');
    } catch (err) {
        setError("Coach is currently unavailable. Please try again.");
        setStep('REFLECTION');
    }
  };

  const handleApply = () => {
    if (reviewResult) {
        onApply(reviewResult);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/30">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
            <i className="fa-solid fa-clipboard-list mr-2 text-indigo-600 dark:text-indigo-400"></i>
            Weekly Review
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
            {step === 'REFLECTION' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg text-indigo-800 dark:text-indigo-200 text-sm">
                        Take a moment to pause. Reviewing your progress is the best way to ensure you reach your destination.
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            How do you feel about your progress this week?
                        </label>
                        <div className="flex gap-4 mb-2">
                            {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setMood(val)}
                                    className={`flex-1 py-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1
                                        ${mood === val 
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' 
                                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-200'}`}
                                >
                                    <i className={`fa-solid text-xl
                                        ${val === 1 ? 'fa-face-dizzy' : 
                                          val === 2 ? 'fa-face-frown' : 
                                          val === 3 ? 'fa-face-meh' : 
                                          val === 4 ? 'fa-face-smile' : 'fa-face-laugh-beam'}`}>
                                    </i>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 px-1">
                            <span>Struggling</span>
                            <span>Unstoppable</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            What went well? What got in the way?
                        </label>
                        <textarea
                            value={reflection}
                            onChange={(e) => setReflection(e.target.value)}
                            placeholder="I completed the reading but skipped the practice exercises because..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all resize-none"
                        />
                    </div>
                    
                    {error && (
                        <p className="text-red-500 text-sm">{error}</p>
                    )}
                </div>
            )}

            {step === 'LOADING' && (
                <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Analyzing Progress...</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs">
                        The AI Coach is reviewing your stats and reflection to optimize your plan.
                    </p>
                </div>
            )}

            {step === 'RESULTS' && reviewResult && (
                <div className="space-y-6 animate-fade-in">
                    {/* Coach Analysis */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-800 p-5 rounded-xl border border-indigo-100 dark:border-slate-600 relative">
                        <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 text-4xl opacity-10">
                            <i className="fa-solid fa-quote-right"></i>
                        </div>
                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide mb-2">Coach Feedback</h4>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                            "{reviewResult.analysis}"
                        </p>
                    </div>

                    {/* Proposed Changes */}
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white mb-3">Proposed Plan Updates</h4>
                        
                        {reviewResult.modifications.length === 0 && reviewResult.newSteps.length === 0 ? (
                            <div className="text-slate-500 dark:text-slate-400 text-sm italic border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                                No changes needed! You are right on track.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reviewResult.modifications.map((mod, idx) => {
                                    // Find original title for context (passed strictly as string might be hard without full lookup, assuming ID mapping)
                                    // Since we don't have easy access to the original title map here without more logic, we display generic info or try to find it
                                    const originalStep = goal.steps.find(s => s.id === mod.stepId);
                                    return (
                                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <div className="mt-1 text-orange-500"><i className="fa-solid fa-pen-to-square"></i></div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-800 dark:text-white">
                                                    Update: {originalStep?.title || 'Existing Step'}
                                                </p>
                                                <ul className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-1">
                                                    {Object.entries(mod.changes).map(([key, val]) => (
                                                        <li key={key} className="flex items-center">
                                                            <span className="capitalize w-20 text-slate-400">{key}:</span> 
                                                            <span className="font-medium text-slate-700 dark:text-slate-300">{val}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    );
                                })}

                                {reviewResult.newSteps.map((step, idx) => (
                                    <div key={`new-${idx}`} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/50">
                                        <div className="mt-1 text-green-600"><i className="fa-solid fa-plus"></i></div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 dark:text-white">
                                                New: {step.title}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {step.deadline} • {step.difficulty}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            {step === 'REFLECTION' && (
                <button
                    onClick={handleGenerate}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                >
                    Review Progress
                </button>
            )}
            {step === 'RESULTS' && (
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                    >
                        Apply Changes
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};