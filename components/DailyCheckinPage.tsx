import React from 'react';
import { Goal, Frequency } from '../types';
import { StepItem } from './StepItem';

interface DailyCheckinPageProps {
  goals: Goal[];
  onToggleStep: (goalId: string, stepId: string) => void;
  onDeadlineChange: (goalId: string, stepId: string, newDate: string) => void;
  onDeleteStep: (goalId: string, stepId: string) => void;
  onBreakDownStep: (goalId: string, stepId: string) => Promise<void>;
  onToggleSubStep: (goalId: string, stepId: string, subStepId: string) => void;
}

export const DailyCheckinPage: React.FC<DailyCheckinPageProps> = ({ 
  goals, 
  onToggleStep,
  onDeadlineChange,
  onDeleteStep,
  onBreakDownStep,
  onToggleSubStep
}) => {
  // Filter goals that have Daily steps
  const dailyGoals = goals.map(goal => ({
    ...goal,
    steps: goal.steps.filter(step => step.frequency === Frequency.DAILY)
  })).filter(goal => goal.steps.length > 0);

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Daily Check-ins</h1>
        <p className="text-slate-500 dark:text-slate-400">Review and complete your daily habits across all your goals.</p>
      </div>

      {dailyGoals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
           <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                <i className="fa-solid fa-mug-hot text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No daily habits yet</h3>
            <p className="text-slate-500 dark:text-slate-400">
                You don't have any tasks set to repeat "Daily". <br/>
                Add some recurring steps to your goals to see them here!
            </p>
        </div>
      ) : (
        <div className="space-y-8">
            {dailyGoals.map(goal => (
                <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                            {goal.title.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{goal.title}</h2>
                    </div>
                    <div className="p-4 sm:p-6">
                        {goal.steps.map((step, index) => (
                                <StepItem
                                key={step.id}
                                step={step}
                                index={index}
                                onToggle={(stepId) => onToggleStep(goal.id, stepId)}
                                onDelete={(stepId) => onDeleteStep(goal.id, stepId)}
                                onDeadlineChange={(stepId, date) => onDeadlineChange(goal.id, stepId, date)}
                                onBreakDownStep={(stepId) => onBreakDownStep(goal.id, stepId)}
                                onToggleSubStep={(stepId, subStepId) => onToggleSubStep(goal.id, stepId, subStepId)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <div className="text-center pt-8 pb-12">
                <p className="text-slate-400 dark:text-slate-500 text-sm italic">
                    "Success is the sum of small efforts, repeated day in and day out."
                </p>
            </div>
        </div>
      )}
    </div>
  );
};