import React, { useState, useRef, useEffect } from 'react';
import { ActionStep, Difficulty, Frequency } from '../types';

interface StepItemProps {
  step: ActionStep;
  index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDeadlineChange: (id: string, newDate: string) => void;
  onEnterFocusMode?: (step: ActionStep) => void;
  onBreakDownStep?: (id: string) => Promise<void>;
  onToggleSubStep?: (stepId: string, subStepId: string) => void;
  onMoveToTop?: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onMoveToBottom?: (index: number) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export const StepItem: React.FC<StepItemProps> = ({ 
  step, 
  index,
  onToggle, 
  onDelete, 
  onDeadlineChange,
  onEnterFocusMode,
  onBreakDownStep,
  onToggleSubStep,
  onMoveToTop,
  onMoveUp,
  onMoveDown,
  onMoveToBottom,
  canMoveUp,
  canMoveDown
}) => {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [tempDeadline, setTempDeadline] = useState(step.deadline || '');
  const [isExpanding, setIsExpanding] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempDeadline(step.deadline || '');
  }, [step.deadline]);

  useEffect(() => {
    if (isEditingDate && dateInputRef.current) {
        if ('showPicker' in HTMLInputElement.prototype) {
            try {
                dateInputRef.current.showPicker();
            } catch (err) {
                // Ignore
            }
        }
        dateInputRef.current.focus();
    }
  }, [isEditingDate]);
  
  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case Difficulty.EASY: return 'text-green-600 bg-green-50 border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900';
      case Difficulty.MEDIUM: return 'text-yellow-600 bg-yellow-50 border-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900';
      case Difficulty.HARD: return 'text-red-600 bg-red-50 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getFrequencyBadge = (freq: Frequency) => {
    switch(freq) {
        case Frequency.DAILY: return <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 uppercase tracking-wide">Daily</span>;
        case Frequency.WEEKLY: return <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800 uppercase tracking-wide">Weekly</span>;
        case Frequency.MONTHLY: return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800 uppercase tracking-wide">Monthly</span>;
        default: return null;
    }
  };

  const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getBucketKey = (dateStr: string, freq: Frequency): string => {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);

      if (freq === Frequency.DAILY) {
          return dateStr;
      }
      if (freq === Frequency.WEEKLY) {
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(d);
          monday.setDate(diff);
          return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
      }
      if (freq === Frequency.MONTHLY) {
          return `${d.getFullYear()}-${d.getMonth() + 1}`;
      }
      return dateStr;
  };

  const subtractPeriod = (dateStr: string, freq: Frequency): string => {
      const d = new Date(dateStr);
      if (freq === Frequency.DAILY) {
          d.setDate(d.getDate() - 1);
      } else if (freq === Frequency.WEEKLY) {
          d.setDate(d.getDate() - 7);
      } else if (freq === Frequency.MONTHLY) {
          d.setMonth(d.getMonth() - 1);
      }
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const formattedDeadline = step.deadline
    ? new Date(step.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTempDeadline(e.target.value);
  };

  const handleDeadlineSave = () => {
      if (tempDeadline !== step.deadline) {
          onDeadlineChange(step.id, tempDeadline);
      }
      setIsEditingDate(false);
  };

  const handleBreakDown = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onBreakDownStep) return;
      
      setIsExpanding(true);
      try {
          await onBreakDownStep(step.id);
      } finally {
          setIsExpanding(false);
      }
  };

  const isRecurring = step.frequency !== Frequency.ONCE;
  let isChecked = step.isCompleted;
  let isSatisfiedForPeriod = false;

  const today = getLocalDate();
  let currentStreak = 0;
  
  if (isRecurring && step.checkIns) {
    isChecked = step.checkIns.includes(today);
    const lastCheckInStr = step.checkIns.length > 0 ? step.checkIns[step.checkIns.length - 1] : null;
    
    if (step.frequency === Frequency.DAILY) {
        if (lastCheckInStr === today) isSatisfiedForPeriod = true;
    } else if (step.frequency === Frequency.WEEKLY) {
        if (lastCheckInStr) {
            const currentBucket = getBucketKey(today, Frequency.WEEKLY);
            const lastCheckBucket = getBucketKey(lastCheckInStr, Frequency.WEEKLY);
            isSatisfiedForPeriod = currentBucket === lastCheckBucket;
        }
    } else if (step.frequency === Frequency.MONTHLY) {
        if (lastCheckInStr) {
            const currentBucket = getBucketKey(today, Frequency.MONTHLY);
            const lastCheckBucket = getBucketKey(lastCheckInStr, Frequency.MONTHLY);
            isSatisfiedForPeriod = currentBucket === lastCheckBucket;
        }
    }

    const checkSet = new Set(step.checkIns.map(d => getBucketKey(d, step.frequency)));
    let cursorDateStr = today;
    let cursorBucket = getBucketKey(cursorDateStr, step.frequency);
    
    if (checkSet.has(cursorBucket)) {
        currentStreak++;
    }

    let prevDateStr = subtractPeriod(cursorDateStr, step.frequency);
    let prevBucket = getBucketKey(prevDateStr, step.frequency);

    while (checkSet.has(prevBucket)) {
        currentStreak++;
        prevDateStr = subtractPeriod(prevDateStr, step.frequency);
        prevBucket = getBucketKey(prevDateStr, step.frequency);
    }
  } else {
      isSatisfiedForPeriod = step.isCompleted;
  }

  const rowOpacity = isSatisfiedForPeriod ? 'opacity-75' : 'opacity-100';
  const rowBg = isSatisfiedForPeriod ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800';
  const titleDecoration = isSatisfiedForPeriod && !isRecurring ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white';
  const hasSubSteps = step.subSteps && step.subSteps.length > 0;

  const showReorderControls = onMoveToTop || onMoveUp || onMoveDown || onMoveToBottom;
  const reorderButtonBaseClasses = 'w-8 h-8 flex items-center justify-center rounded-md border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors';

  return (
    <div
        className={`flex flex-col p-4 mb-3 rounded-lg border transition-all duration-300 group relative ${rowBg} border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 ${rowOpacity}`}
    >
      <div className="flex items-start">
          {showReorderControls && (
            <div className="hidden sm:flex pt-1 mr-3 flex-col gap-1 text-slate-300 dark:text-slate-500">
              <button
                onClick={(e) => { e.stopPropagation(); onMoveToTop && onMoveToTop(index); }}
                disabled={!canMoveUp}
                className={`${reorderButtonBaseClasses} ${!canMoveUp ? 'opacity-40 cursor-not-allowed' : 'hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                title="Move to top"
              >
                <i className="fa-solid fa-angles-up"></i>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveUp && onMoveUp(index); }}
                disabled={!canMoveUp}
                className={`${reorderButtonBaseClasses} ${!canMoveUp ? 'opacity-40 cursor-not-allowed' : 'hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                title="Move up"
              >
                <i className="fa-solid fa-arrow-up"></i>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveDown && onMoveDown(index); }}
                disabled={!canMoveDown}
                className={`${reorderButtonBaseClasses} ${!canMoveDown ? 'opacity-40 cursor-not-allowed' : 'hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                title="Move down"
              >
                <i className="fa-solid fa-arrow-down"></i>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveToBottom && onMoveToBottom(index); }}
                disabled={!canMoveDown}
                className={`${reorderButtonBaseClasses} ${!canMoveDown ? 'opacity-40 cursor-not-allowed' : 'hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                title="Move to bottom"
              >
                <i className="fa-solid fa-angles-down"></i>
              </button>
            </div>
          )}

          <div className="pt-1 mr-4">
            <button 
                onClick={() => onToggle(step.id)}
                onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500
                ${isChecked
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-500'}`}
                title={isRecurring ? "Check-in for today" : "Mark as complete"}
            >
                <i className="fa-solid fa-check text-xs"></i>
            </button>
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getFrequencyBadge(step.frequency)}
                        <h4 className={`text-base font-medium ${titleDecoration}`}>
                            {step.title}
                        </h4>
                        {isRecurring && isSatisfiedForPeriod && !isChecked && (
                            <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-900 flex items-center">
                                <i className="fa-solid fa-check mr-1"></i>
                                Done for {step.frequency.toLowerCase()}
                            </span>
                        )}
                        {isRecurring && step.frequency === Frequency.DAILY && isChecked && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900 flex items-center animate-fade-in">
                                <i className="fa-solid fa-moon mr-1"></i>
                                See you tomorrow!
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                    {showReorderControls && (
                        <div className="flex items-center gap-1 text-slate-300 dark:text-slate-500 sm:hidden">
                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveToTop && onMoveToTop(index); }}
                                disabled={!canMoveUp}
                                className={`${reorderButtonBaseClasses} ${!canMoveUp ? 'opacity-40 cursor-not-allowed' : 'hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                                title="Move to top"
                            >
                                <i className="fa-solid fa-angles-up"></i>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveUp && onMoveUp(index); }}
                                disabled={!canMoveUp}
                                className={`${reorderButtonBaseClasses} ${!canMoveUp ? 'opacity-40 cursor-not-allowed' : 'hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                                title="Move up"
                            >
                                <i className="fa-solid fa-arrow-up"></i>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveDown && onMoveDown(index); }}
                                disabled={!canMoveDown}
                                className={`${reorderButtonBaseClasses} ${!canMoveDown ? 'opacity-40 cursor-not-allowed' : 'hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                                title="Move down"
                            >
                                <i className="fa-solid fa-arrow-down"></i>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveToBottom && onMoveToBottom(index); }}
                                disabled={!canMoveDown}
                                className={`${reorderButtonBaseClasses} ${!canMoveDown ? 'opacity-40 cursor-not-allowed' : 'hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                                title="Move to bottom"
                            >
                                <i className="fa-solid fa-angles-down"></i>
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                    {isEditingDate ? (
                        <div className="flex items-center space-x-1">
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={tempDeadline}
                                onChange={handleDateChange}
                                onBlur={handleDeadlineSave}
                                onClick={(e) => e.stopPropagation()}
                                onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className="text-xs px-2 py-0.5 rounded border border-indigo-300 bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 w-28"
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeadlineSave(); }}
                                className="text-[11px] px-2 py-1 rounded border border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                                Set
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingDate(true);
                            }}
                            onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            className={`text-xs px-2 py-0.5 rounded border transition-colors cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center ${isSatisfiedForPeriod ? 'bg-slate-100 dark:bg-slate-700 text-slate-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800'}`}
                            title="Click to edit deadline"
                        >
                            <i className="fa-regular fa-calendar mr-1 text-[10px]"></i>
                            {formattedDeadline || 'Set Date'}
                        </button>
                    )}
                    
                    <span className={`text-xs px-2 py-0.5 rounded border ${getDifficultyColor(step.difficulty)}`}>
                        {step.difficulty}
                    </span>
                    </div>
                </div>
            </div>

            <p className={`text-sm mt-1 ${isSatisfiedForPeriod ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                {step.description}
            </p>

            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
                    <i className="fa-regular fa-clock mr-1"></i>
                    {step.estimatedTime}
                    
                    {/* Stats Display */}
                    {isRecurring && step.checkIns && step.checkIns.length > 0 && (
                        <div className="ml-4 flex items-center space-x-3 animate-fade-in">
                            <span 
                                className={`flex items-center font-bold px-1.5 py-0.5 rounded ${currentStreak > 0 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}
                                title={`Consecutive ${step.frequency.toLowerCase()}s completed`}
                            >
                                <i className={`fa-solid fa-fire mr-1.5 ${currentStreak > 0 ? 'text-orange-500' : 'text-slate-300'}`}></i>
                                {currentStreak} {step.frequency === Frequency.DAILY ? 'Day' : step.frequency === Frequency.WEEKLY ? 'Week' : 'Month'} Streak
                            </span>

                            {step.frequency !== Frequency.DAILY && (
                                <span 
                                    className="flex items-center font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900"
                                    title={`Total check-ins`}
                                >
                                    <i className="fa-solid fa-clipboard-check mr-1.5"></i>
                                    {step.checkIns.length} Total
                                </span>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                {/* Break Down Button */}
                {!isSatisfiedForPeriod && onBreakDownStep && !hasSubSteps && (
                    <button
                        onClick={handleBreakDown}
                        disabled={isExpanding}
                        onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="text-slate-300 hover:text-purple-500 dark:hover:text-purple-400 p-1.5 rounded transition-colors flex items-center gap-1 group/magic"
                        title="Magic Expand: Break this down into micro-steps"
                    >
                        {isExpanding ? (
                            <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                        ) : (
                            <i className="fa-solid fa-wand-magic-sparkles group-hover/magic:scale-110 transition-transform"></i>
                        )}
                        <span className="text-[10px] font-medium hidden group-hover/magic:inline-block animate-fade-in">Break Down</span>
                    </button>
                )}

                {/* Focus Mode Button */}
                {!isSatisfiedForPeriod && onEnterFocusMode && (
                    <button
                        onClick={(e) => {
                        e.stopPropagation();
                        onEnterFocusMode(step);
                        }}
                        onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 p-1.5 rounded transition-colors"
                        title="Deep Focus Mode"
                    >
                        <i className="fa-solid fa-crosshairs"></i>
                    </button>
                )}

                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(step.id);
                    }}
                    onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                    title="Delete step"
                >
                    <i className="fa-solid fa-trash-can"></i>
                </button>
                </div>
            </div>
          </div>
      </div>

      {/* Sub Steps List */}
      {hasSubSteps && (
          <div className="ml-12 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 animate-fade-in">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Micro-Steps</p>
              <div className="space-y-2">
                  {step.subSteps!.map((sub, subIndex) => {
                    const subId = sub.id || `${step.id}-sub-${subIndex}`;
                    return (
                      <div
                        key={subId}
                        className="flex items-center group/sub"
                        onClick={(e) => e.stopPropagation()} // Prevent parent click
                      >
                          <button
                            onClick={() => onToggleSubStep && onToggleSubStep(step.id, subId)}
                            className={`w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors
                                ${sub.isCompleted
                                    ? 'bg-purple-500 border-purple-500 text-white'
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-purple-400'}`}
                          >
                              {sub.isCompleted && <i className="fa-solid fa-check text-[10px]"></i>}
                          </button>
                          <span className={`text-xs ${sub.isCompleted ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                              {sub.title}
                          </span>
                      </div>
                  );
                  })}
              </div>
          </div>
      )}
    </div>
  );
};