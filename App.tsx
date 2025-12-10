import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Goal, ActionStep, GoalStatus, Frequency, UserPreferences, AIPersona, Difficulty, ReviewResponse } from './types';
import { GoalCard } from './components/GoalCard';
import { StepItem } from './components/StepItem';
import { CreateGoal } from './components/CreateGoal';
import { AddStepModal } from './components/AddStepModal';
import { LandingPage } from './components/LandingPage';
import { Navigation } from './components/Navigation';
import { DailyCheckinPage } from './components/DailyCheckinPage';
import { PreferencesPage } from './components/PreferencesPage';
import { FocusMode } from './components/FocusMode';
import { WeeklyReviewModal } from './components/WeeklyReviewModal';
import { AboutPage } from './components/AboutPage';
import { generateMoreSteps, generateSubSteps } from './services/geminiService';

// Helper to get local YYYY-MM-DD string to ensure resets happen at local midnight
const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to check if a recurring step is satisfied for the current period
const isRequirementMet = (step: ActionStep): boolean => {
    if (step.frequency === Frequency.ONCE) return step.isCompleted;

    if (!step.checkIns || step.checkIns.length === 0) return false;

    // step.checkIns stores strings like "2023-10-25"
    const today = getLocalDate();
    const lastCheckInStr = step.checkIns[step.checkIns.length - 1];

    if (step.frequency === Frequency.DAILY) {
        return lastCheckInStr === today;
    } 
    
    if (step.frequency === Frequency.WEEKLY) {
        // Check if last check-in was within the last 7 days
        const lastDate = new Date(lastCheckInStr);
        const nowDate = new Date(today);
        const diffTime = Math.abs(nowDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }

    if (step.frequency === Frequency.MONTHLY) {
        const lastDate = new Date(lastCheckInStr);
        const nowDate = new Date(today);
        return lastDate.getMonth() === nowDate.getMonth() && lastDate.getFullYear() === nowDate.getFullYear();
    }

    return false;
};

// Helper to calculate progress percentage
const calculateProgress = (steps: ActionStep[]): number => {
  if (steps.length === 0) return 0;
  
  const completedCount = steps.reduce((acc, step) => {
      return acc + (isRequirementMet(step) ? 1 : 0);
  }, 0);

  return (completedCount / steps.length) * 100;
};

// Helper to determine status
const determineStatus = (steps: ActionStep[]): GoalStatus => {
  const progress = calculateProgress(steps);
  if (progress === 100) return GoalStatus.COMPLETED;
  if (progress > 0) return GoalStatus.IN_PROGRESS;
  return GoalStatus.NOT_STARTED;
};

// Helper for XP calculation
const getXpForDifficulty = (difficulty: Difficulty): number => {
    switch (difficulty) {
        case Difficulty.HARD: return 50;
        case Difficulty.MEDIUM: return 30;
        case Difficulty.EASY: 
        default: return 10;
    }
};

export default function App() {
  // --- STATE INITIALIZATION ---
  
  const [goals, setGoals] = useState<Goal[]>(() => {
    const savedGoals = localStorage.getItem('actionpath_goals');
    if (savedGoals) {
        try {
            const parsedGoals: Goal[] = JSON.parse(savedGoals);
            return parsedGoals.map(g => ({
                ...g,
                steps: g.steps.map(s => ({
                    ...s,
                    frequency: s.frequency || Frequency.ONCE,
                    checkIns: s.checkIns || [],
                    subSteps: s.subSteps || []
                })),
                progress: calculateProgress(g.steps.map(s => ({
                    ...s,
                    frequency: s.frequency || Frequency.ONCE,
                    checkIns: s.checkIns || []
                }))),
                archived: g.archived || false
            }));
        } catch (e) {
            console.error("Failed to parse goals", e);
            return [];
        }
    }
    return [];
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const savedPrefs = localStorage.getItem('actionpath_prefs');
    if (savedPrefs) {
        try {
            const parsed = JSON.parse(savedPrefs);
            return {
                displayName: parsed.displayName || '',
                darkMode: parsed.darkMode || false,
                aiPersona: parsed.aiPersona || AIPersona.MOTIVATIONAL,
                totalXp: parsed.totalXp || 0
            };
        } catch (e) {
            console.error("Failed to parse preferences", e);
        }
    }
    return {
        displayName: '',
        darkMode: false,
        aiPersona: AIPersona.MOTIVATIONAL,
        totalXp: 0
    };
  });

  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'create' | 'detail' | 'daily' | 'preferences' | 'about'>(() => {
      const hasVisibleGoals = goals.some(g => !g.archived);
      return hasVisibleGoals ? 'dashboard' : 'landing';
  });

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // Focus Mode State
  const [activeFocusStep, setActiveFocusStep] = useState<ActionStep | null>(null);

  // Refs for Drag and Drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // --- EFFECTS ---

  // Save Goals
  useEffect(() => {
    localStorage.setItem('actionpath_goals', JSON.stringify(goals));
  }, [goals]);

  // Save Preferences
  useEffect(() => {
    localStorage.setItem('actionpath_prefs', JSON.stringify(preferences));
  }, [preferences]);

  // Apply Dark Mode
  useEffect(() => {
    if (preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.darkMode]);

  // --- HANDLERS ---

  const handleImportData = (data: { goals: Goal[], preferences: UserPreferences }) => {
    try {
        if (data.preferences) {
            setPreferences(prev => ({ ...prev, ...data.preferences }));
        }

        if (Array.isArray(data.goals)) {
            const sanitizedGoals = data.goals.map(g => {
                const sanitizedSteps = Array.isArray(g.steps) ? g.steps.map(s => ({
                    ...s,
                    frequency: Object.values(Frequency).includes(s.frequency) ? s.frequency : Frequency.ONCE,
                    difficulty: Object.values(Difficulty).includes(s.difficulty) ? s.difficulty : Difficulty.EASY,
                    checkIns: Array.isArray(s.checkIns) ? s.checkIns : [],
                    isCompleted: !!s.isCompleted,
                    subSteps: Array.isArray(s.subSteps) ? s.subSteps : []
                })) : [];

                return {
                    ...g,
                    id: g.id || Math.random().toString(36).substring(2, 9),
                    title: g.title || 'Untitled Goal',
                    createdAt: g.createdAt || new Date().toISOString(),
                    status: Object.values(GoalStatus).includes(g.status) ? g.status : GoalStatus.NOT_STARTED,
                    archived: !!g.archived,
                    steps: sanitizedSteps,
                    progress: calculateProgress(sanitizedSteps)
                };
            });
            
            setGoals(sanitizedGoals);
            alert('Data imported successfully!');
            setCurrentView('dashboard');
        } else {
            throw new Error("Invalid format: 'goals' is not an array");
        }
    } catch (e) {
        console.error("Import failed:", e);
        alert("Failed to import data. Please ensure the JSON file is valid.");
    }
  };

  const handleResetData = () => {
    setGoals([]);
    setPreferences({
        displayName: '',
        darkMode: false,
        aiPersona: AIPersona.MOTIVATIONAL,
        totalXp: 0
    });
    localStorage.removeItem('actionpath_goals');
    localStorage.removeItem('actionpath_prefs');
    setCurrentView('landing');
  };

  const handlePlanGenerated = (title: string, motivation: string, deadline: string, steps: ActionStep[]) => {
    const newGoal: Goal = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      motivation,
      deadline,
      createdAt: new Date().toISOString(),
      status: GoalStatus.NOT_STARTED,
      progress: 0,
      steps,
      archived: false
    };
    setGoals(prev => [newGoal, ...prev]);
    setCurrentView('dashboard');
  };

  const toggleStep = (stepId: string, goalIdOverride?: string) => {
    const targetGoalId = goalIdOverride || selectedGoalId;
    if (!targetGoalId) return;

    // First calculate XP change
    const goal = goals.find(g => g.id === targetGoalId);
    const step = goal?.steps.find(s => s.id === stepId);
    
    if (goal && step) {
        const today = getLocalDate();
        const difficultyXp = getXpForDifficulty(step.difficulty);
        let xpDelta = 0;

        if (step.frequency === Frequency.ONCE) {
            // If currently not completed, we are completing it -> Gain XP
            // If currently completed, we are uncompleting it -> Lose XP
            xpDelta = !step.isCompleted ? difficultyXp : -difficultyXp;
        } else {
            // Recurring
            const isCheckedToday = (step.checkIns || []).includes(today);
            // If not checked today, we are checking it -> Gain XP
            xpDelta = !isCheckedToday ? difficultyXp : -difficultyXp;
        }

        if (xpDelta !== 0) {
            setPreferences(prev => ({
                ...prev,
                totalXp: Math.max(0, (prev.totalXp || 0) + xpDelta)
            }));
        }
    }

    setGoals(prev => prev.map(goal => {
      if (goal.id !== targetGoalId) return goal;

      const updatedSteps = goal.steps.map(step => {
        if (step.id !== stepId) return step;

        const today = getLocalDate();

        if (step.frequency === Frequency.ONCE) {
            return { ...step, isCompleted: !step.isCompleted };
        } else {
            // Recurring Logic
            const checkIns = step.checkIns || [];
            const alreadyCheckedInToday = checkIns.includes(today);
            
            let newCheckIns;
            if (alreadyCheckedInToday) {
                newCheckIns = checkIns.filter(d => d !== today);
            } else {
                newCheckIns = [...checkIns, today];
            }
            return { ...step, checkIns: newCheckIns };
        }
      });

      return {
        ...goal,
        steps: updatedSteps,
        progress: calculateProgress(updatedSteps),
        status: determineStatus(updatedSteps)
      };
    }));
  };

  const toggleSubStep = (stepId: string, subStepId: string, goalIdOverride?: string) => {
      const targetGoalId = goalIdOverride || selectedGoalId;
      if (!targetGoalId) return;

      setGoals(prev => prev.map(goal => {
          if (goal.id !== targetGoalId) return goal;
          
          const updatedSteps = goal.steps.map(step => {
              if (step.id !== stepId) return step;
              if (!step.subSteps) return step;

              const updatedSubSteps = step.subSteps.map(sub => 
                  sub.id === subStepId ? { ...sub, isCompleted: !sub.isCompleted } : sub
              );

              return { ...step, subSteps: updatedSubSteps };
          });

          return { ...goal, steps: updatedSteps };
      }));
  };

  const handleBreakDownStep = async (stepId: string, goalIdOverride?: string) => {
      const targetGoalId = goalIdOverride || selectedGoalId;
      if (!targetGoalId) return;

      const goal = goals.find(g => g.id === targetGoalId);
      const step = goal?.steps.find(s => s.id === stepId);
      if (!goal || !step) return;

      try {
          const subSteps = await generateSubSteps(step.title, step.description, goal.title, preferences.aiPersona);
          
          setGoals(prev => prev.map(g => {
              if (g.id !== targetGoalId) return g;
              
              const updatedSteps = g.steps.map(s => {
                  if (s.id !== stepId) return s;
                  return { ...s, subSteps };
              });
              
              return { ...g, steps: updatedSteps };
          }));
      } catch (e) {
          console.error(e);
          alert("Could not break down this step. Please try again.");
      }
  };

  const handleStepDeadlineChange = (stepId: string, newDate: string, goalIdOverride?: string) => {
    const targetGoalId = goalIdOverride || selectedGoalId;
    if (!targetGoalId) return;

    setGoals(prev => prev.map(goal => {
      if (goal.id !== targetGoalId) return goal;

      const updatedSteps = goal.steps.map(step => 
        step.id === stepId ? { ...step, deadline: newDate } : step
      );

      return {
        ...goal,
        steps: updatedSteps
      };
    }));
  };

  const handleDeleteStep = (stepId: string, goalIdOverride?: string) => {
    const targetGoalId = goalIdOverride || selectedGoalId;
    if (!targetGoalId) return;

    setGoals(prev => prev.map(goal => {
      if (goal.id !== targetGoalId) return goal;
      const updatedSteps = goal.steps.filter(s => s.id !== stepId);
      return {
        ...goal,
        steps: updatedSteps,
        progress: calculateProgress(updatedSteps),
        status: determineStatus(updatedSteps)
      };
    }));
  };

  const handleApplyReview = (response: ReviewResponse) => {
    if (!selectedGoalId) return;
    
    setGoals(prev => prev.map(goal => {
        if (goal.id !== selectedGoalId) return goal;

        // 1. Update existing steps
        let updatedSteps = goal.steps.map(step => {
            const modification = response.modifications.find(m => m.stepId === step.id);
            if (modification) {
                return { ...step, ...modification.changes };
            }
            return step;
        });

        // 2. Add new steps
        updatedSteps = [...updatedSteps, ...response.newSteps];

        return {
            ...goal,
            steps: updatedSteps,
            progress: calculateProgress(updatedSteps),
            status: determineStatus(updatedSteps)
        };
    }));
    
    setIsReviewModalOpen(false);
  };

  const handleGenerateMore = async () => {
    const goal = goals.find(g => g.id === selectedGoalId);
    if (!goal || !selectedGoalId) return;

    setIsGeneratingMore(true);
    try {
        const newSteps = await generateMoreSteps(goal.title, goal.motivation, goal.steps, preferences.aiPersona);
        
        setGoals(prev => prev.map(g => {
            if (g.id !== selectedGoalId) return g;
            
            const updatedSteps = [...g.steps, ...newSteps];
            return {
                ...g,
                steps: updatedSteps,
                progress: calculateProgress(updatedSteps),
                status: determineStatus(updatedSteps)
            };
        }));
    } catch (e) {
        console.error(e);
        alert("Failed to generate more steps. Please try again.");
    } finally {
        setIsGeneratingMore(false);
    }
  };

  const handleManualAddStep = (stepData: Omit<ActionStep, 'id' | 'isCompleted' | 'checkIns'>) => {
      if (!selectedGoalId) return;

      const newStep: ActionStep = {
          id: Math.random().toString(36).substring(2, 9),
          ...stepData,
          isCompleted: false,
          checkIns: [],
          subSteps: []
      };

      setGoals(prev => prev.map(g => {
          if (g.id !== selectedGoalId) return g;
          const updatedSteps = [...g.steps, newStep];
          return {
              ...g,
              steps: updatedSteps,
              progress: calculateProgress(updatedSteps),
              status: determineStatus(updatedSteps)
          };
      }));

      setIsAddStepModalOpen(false);
  };

  const handleDeleteGoal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    setGoals(prev => prev.filter(g => g.id !== id));
    if (selectedGoalId === id) {
        setSelectedGoalId(null);
        setCurrentView('dashboard');
    }
  };

  const handleConfirmDeleteGoal = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm('Are you sure you want to delete this goal permanently?')) {
          handleDeleteGoal(e, id);
      }
  };

  const handleArchiveGoal = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setGoals(prev => prev.map(g => g.id === id ? { ...g, archived: true } : g));
      if (selectedGoalId === id) {
          setSelectedGoalId(null);
          setCurrentView('dashboard');
      }
  };

  const handleRestoreGoal = (id: string) => {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, archived: false } : g));
  };

  const handleGoalClick = (id: string) => {
    setSelectedGoalId(id);
    setCurrentView('detail');
  };

  // --- Focus Mode Handlers ---
  const handleEnterFocusMode = (step: ActionStep) => {
      setActiveFocusStep(step);
  };

  const handleCompleteFocusMode = () => {
    if (activeFocusStep) {
        toggleStep(activeFocusStep.id);
        setActiveFocusStep(null);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    e.preventDefault();
    dragOverItem.current = position;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    
    if (selectedGoalId && dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
        setGoals(prev => prev.map(goal => {
            if (goal.id !== selectedGoalId) return goal;
            
            const steps = [...goal.steps];
            const draggedStepContent = steps[dragItem.current!];
            
            steps.splice(dragItem.current!, 1);
            steps.splice(dragOverItem.current!, 0, draggedStepContent);
            
            return { ...goal, steps };
        }));
    }

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  // Visualization Data for Dashboard
  const visibleGoals = goals.filter(g => !g.archived);
  const activeGoals = visibleGoals.filter(g => g.status !== GoalStatus.COMPLETED).length;
  const completedGoals = visibleGoals.filter(g => g.status === GoalStatus.COMPLETED).length;
  
  const welcomeName = preferences.displayName ? `, ${preferences.displayName}` : '';

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200 ${currentView === 'landing' ? 'bg-white dark:bg-slate-900' : 'pb-20'}`}>
      
      <Navigation 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        hasGoals={visibleGoals.length > 0} 
        preferences={preferences}
      />

      {currentView === 'landing' && (
          <LandingPage onGetStarted={() => setCurrentView(visibleGoals.length > 0 ? 'dashboard' : 'create')} />
      )}

      {currentView !== 'landing' && (
        <main className="max-w-5xl mx-auto px-4 pt-8">
            
            {currentView === 'create' && (
                <CreateGoal 
                    onPlanGenerated={handlePlanGenerated} 
                    onCancel={() => setCurrentView(visibleGoals.length > 0 ? 'dashboard' : 'landing')} 
                    aiPersona={preferences.aiPersona}
                />
            )}

            {currentView === 'preferences' && (
                <PreferencesPage 
                    preferences={preferences}
                    goals={goals}
                    onUpdatePreferences={setPreferences}
                    onImportData={handleImportData}
                    onResetData={handleResetData}
                    onRestoreGoal={handleRestoreGoal}
                    onDeleteGoal={(id) => setGoals(prev => prev.filter(g => g.id !== id))}
                />
            )}
            
            {currentView === 'about' && (
                <AboutPage onBack={() => setCurrentView(visibleGoals.length > 0 ? 'dashboard' : 'landing')} />
            )}

            {currentView === 'daily' && (
                <DailyCheckinPage 
                    goals={visibleGoals}
                    onToggleStep={(goalId, stepId) => toggleStep(stepId, goalId)}
                    onDeadlineChange={(goalId, stepId, date) => handleStepDeadlineChange(stepId, date, goalId)}
                    onDeleteStep={(goalId, stepId) => handleDeleteStep(stepId, goalId)}
                    onBreakDownStep={(goalId, stepId) => handleBreakDownStep(stepId, goalId)}
                    onToggleSubStep={(goalId, stepId, subStepId) => toggleSubStep(stepId, subStepId, goalId)}
                />
            )}

            {currentView === 'dashboard' && (
                <div className="animate-fade-in">
                    <div className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
                                <i className="fa-solid fa-bullseye text-9xl"></i>
                            </div>
                            <h1 className="text-3xl font-bold mb-2">Welcome back{welcomeName}!</h1>
                            <p className="text-indigo-100 mb-6 max-w-md">
                                You have {activeGoals} active goals. Consistent action creates consistent results. Let's get moving.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setCurrentView('create')}
                                    className="px-5 py-2.5 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center shadow-md"
                                >
                                    Start New Goal
                                    <i className="fa-solid fa-arrow-right ml-2"></i>
                                </button>
                                <button 
                                    onClick={() => setCurrentView('daily')}
                                    className="px-5 py-2.5 bg-indigo-500 bg-opacity-40 text-white rounded-lg font-semibold hover:bg-opacity-50 transition-colors inline-flex items-center"
                                >
                                    Daily Check-ins
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                            <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-4 uppercase tracking-wider">Goal Distribution</h3>
                            <div className="w-full h-40">
                                {visibleGoals.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Active', value: activeGoals },
                                                    { name: 'Completed', value: completedGoals }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={60}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#4f46e5" />
                                                <Cell fill="#10b981" />
                                            </Pie>
                                            <RechartsTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                        <span className="text-sm">No data yet</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex space-x-4 text-xs mt-2">
                                <div className="flex items-center text-slate-600 dark:text-slate-400"><span className="w-2 h-2 rounded-full bg-indigo-600 mr-1"></span> Active</div>
                                <div className="flex items-center text-slate-600 dark:text-slate-400"><span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> Done</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Your Goals</h2>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{visibleGoals.length} total</span>
                    </div>

                    {visibleGoals.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <i className="fa-regular fa-clipboard text-2xl"></i>
                            </div>
                            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No goals yet</h3>
                            <p className="text-slate-400 mb-6">Create your first AI-powered action plan today.</p>
                            <button onClick={() => setCurrentView('create')} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                                Create Goal
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {visibleGoals.map(goal => (
                                <GoalCard 
                                    key={goal.id} 
                                    goal={goal} 
                                    onClick={handleGoalClick} 
                                    onDelete={handleConfirmDeleteGoal}
                                    onArchive={handleArchiveGoal}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {currentView === 'detail' && selectedGoal && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <button 
                            onClick={() => setCurrentView('dashboard')}
                            className="flex items-center text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                        >
                            <i className="fa-solid fa-arrow-left mr-2"></i>
                            Back to Dashboard
                        </button>
                        
                        <button
                            onClick={() => setIsReviewModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-medium text-sm"
                        >
                            <i className="fa-solid fa-clipboard-list"></i>
                            Weekly Review
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{selectedGoal.title}</h1>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-4
                                    ${selectedGoal.status === GoalStatus.COMPLETED ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                    selectedGoal.status === GoalStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                    {selectedGoal.status === GoalStatus.IN_PROGRESS ? 'In Progress' : selectedGoal.status === GoalStatus.COMPLETED ? 'Completed' : 'Not Started'}
                                </span>
                                
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Why</h4>
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                                    {selectedGoal.motivation}
                                </p>

                                {selectedGoal.deadline && (
                                    <div className="mb-6">
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Deadline</h4>
                                        <p className="text-slate-800 dark:text-white text-sm font-medium">
                                            <i className="fa-regular fa-calendar text-indigo-500 mr-2"></i>
                                            {new Date(selectedGoal.deadline).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}

                                <div className="h-px bg-slate-100 dark:bg-slate-700 w-full mb-6"></div>

                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Progress</h4>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{Math.round(selectedGoal.progress)}%</span>
                                    <span className="text-xs text-slate-400">
                                        Current Status
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${selectedGoal.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Action Plan</h3>
                                    <span className="text-xs text-slate-400">Generated by Gemini • Drag to reorder</span>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-1 mb-6">
                                        {selectedGoal.steps.map((step, index) => (
                                            <div key={step.id} className="relative">
                                                {index !== selectedGoal.steps.length - 1 && (
                                                    <div className={`absolute left-9 top-10 bottom-[-12px] w-0.5 z-0 bg-slate-100 dark:bg-slate-700`}></div>
                                                )}
                                                <div className="relative z-10">
                                                    <StepItem 
                                                        step={step}
                                                        index={index}
                                                        onToggle={(stepId) => toggleStep(stepId)}
                                                        onDelete={(stepId) => handleDeleteStep(stepId)}
                                                        onDeadlineChange={(stepId, date) => handleStepDeadlineChange(stepId, date)}
                                                        onDragStart={handleDragStart}
                                                        onDragEnter={handleDragEnter}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={handleDragOver}
                                                        onEnterFocusMode={handleEnterFocusMode}
                                                        onBreakDownStep={(stepId) => handleBreakDownStep(stepId)}
                                                        onToggleSubStep={(stepId, subStepId) => toggleSubStep(stepId, subStepId)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={handleGenerateMore}
                                            disabled={isGeneratingMore}
                                            className="py-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 transition-all font-medium flex items-center justify-center gap-2 group"
                                        >
                                            {isGeneratingMore ? (
                                                <>
                                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fa-solid fa-wand-magic-sparkles group-hover:rotate-12 transition-transform"></i>
                                                    Generate More
                                                </>
                                            )}
                                        </button>

                                        <button 
                                            onClick={() => setIsAddStepModalOpen(true)}
                                            className="py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 transition-all font-medium flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-solid fa-plus"></i>
                                            Add Manual Step
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
      )}

      {currentView === 'dashboard' && (
        <button 
            onClick={() => setCurrentView('create')}
            className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-50"
        >
            <i className="fa-solid fa-plus text-xl"></i>
        </button>
      )}

      {isAddStepModalOpen && (
        <AddStepModal 
          onSave={handleManualAddStep}
          onCancel={() => setIsAddStepModalOpen(false)}
        />
      )}

      {isReviewModalOpen && selectedGoal && (
        <WeeklyReviewModal
            goal={selectedGoal}
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            onApply={handleApplyReview}
            aiPersona={preferences.aiPersona}
        />
      )}

      {activeFocusStep && (
        <FocusMode 
            step={activeFocusStep}
            onComplete={handleCompleteFocusMode}
            onClose={() => setActiveFocusStep(null)}
        />
      )}
    </div>
  );
}