import React from 'react';
import { Goal, GoalStatus } from '../types';

interface GoalCardProps {
  goal: Goal;
  onClick: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onArchive: (e: React.MouseEvent, id: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onClick, onDelete, onArchive }) => {
  // Helper to get completion count for display
  const completedCount = Math.round((goal.progress / 100) * goal.steps.length);
  
  return (
    <div 
      onClick={() => onClick(goal.id)}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 cursor-pointer hover:shadow-md transition-all duration-200 relative group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-1 pr-16">{goal.title}</h3>
        
        {/* Action Buttons - Always visible on mobile, hover on desktop */}
        <div className="absolute top-4 right-4 flex space-x-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 lg:bg-transparent rounded-lg p-1 shadow-sm lg:shadow-none border lg:border-none border-slate-100 dark:border-slate-700">
            <button 
                onClick={(e) => onArchive(e, goal.id)}
                className="text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-lg transition-colors"
                title="Archive Goal"
            >
                <i className="fa-solid fa-box-archive text-sm"></i>
            </button>
            <button 
                onClick={(e) => onDelete(e, goal.id)}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors"
                title="Delete Goal"
            >
                <i className="fa-solid fa-trash text-sm"></i>
            </button>
        </div>
      </div>
      
      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-grow">{goal.motivation}</p>

      {/* Progress Section */}
      <div className="mt-auto">
        <div className="flex justify-between items-end mb-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                ${goal.status === GoalStatus.COMPLETED ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                goal.status === GoalStatus.IN_PROGRESS ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 
                'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                {goal.status === GoalStatus.IN_PROGRESS ? 'In Progress' : goal.status === GoalStatus.COMPLETED ? 'Completed' : 'Not Started'}
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{Math.round(goal.progress)}%</span>
        </div>
        
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-3 overflow-hidden">
            <div 
                className={`h-full rounded-full transition-all duration-500 ${goal.status === GoalStatus.COMPLETED ? 'bg-green-500' : 'bg-indigo-600'}`}
                style={{ width: `${goal.progress}%` }}
            ></div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
             <div className="flex items-center">
                <i className="fa-solid fa-list-check mr-1.5"></i>
                {completedCount}/{goal.steps.length} active
            </div>
            {goal.deadline && (
                <div className="flex items-center">
                    <i className="fa-regular fa-calendar mr-1.5"></i>
                    {new Date(goal.deadline).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};