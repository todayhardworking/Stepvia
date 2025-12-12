import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { subscribeToGoals, addGoal, updateGoal, deleteGoal, getUserPreferences, updateUserPreferences } from './services/firestoreService';
import { Goal, ActionStep, GoalStatus, Frequency, UserPreferences, AIPersona, Difficulty, ReviewResponse } from './types';
import { GoalCard } from './components/GoalCard';
import { StepItem } from './components/StepItem';
import { CreateGoal } from './components/CreateGoal';
import { LandingPage } from './components/LandingPage';
import { Navigation } from './components/Navigation';
import { DailyCheckinPage } from './components/DailyCheckinPage';
import { PreferencesPage } from './components/PreferencesPage';
import { WeeklyReviewModal } from './components/WeeklyReviewModal';
import { AboutPage } from './components/AboutPage';
import { AddStepModal } from './components/AddStepModal';
import { FocusMode } from './components/FocusMode';
import { generateMoreSteps, generateSubSteps } from './services/geminiService';
import { AuthModal } from './components/AuthModal';

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

const DEFAULT_PREFERENCES: UserPreferences = {
    displayName: '',
    darkMode: false,
    aiPersona: AIPersona.MOTIVATIONAL,
    totalXp: 0
};

export default function App() {
    // --- STATE INITIALIZATION ---
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

    const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'create' | 'detail' | 'daily' | 'preferences' | 'about'>('landing');

    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const [isGeneratingMore, setIsGeneratingMore] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalView, setAuthModalView] = useState<'login' | 'signup' | 'forgot' | 'change'>('login');

    // Focus Mode State
    const [activeFocusStep, setActiveFocusStep] = useState<ActionStep | null>(null);

    // Reorder helpers

    // --- AUTH & DATA SYNC ---

    // 1. Auth Observer
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
            if (currentUser) {
                // Logged in: Go to dashboard if not already navigating
                if (currentView === 'landing') setCurrentView('dashboard');
            } else {
                // Logged out: Go to landing
                setCurrentView('landing');
                setGoals([]);
                setPreferences(DEFAULT_PREFERENCES);
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. Data Listener (Goals)
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToGoals(user.uid, (fetchedGoals) => {
            setGoals(fetchedGoals);
        });
        return () => unsubscribe();
    }, [user]);

    // 3. User Preferences Fetcher
    useEffect(() => {
        if (!user) return;

        const fetchPrefs = async () => {
            const prefs = await getUserPreferences(user.uid);
            if (prefs) {
                setPreferences(prefs);
                // Sync local dark mode state
                if (prefs.darkMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            } else {
                // Create default prefs for new user
                await updateUserPreferences(user.uid, { ...DEFAULT_PREFERENCES, displayName: user.displayName || 'User' });
                setPreferences({ ...DEFAULT_PREFERENCES, displayName: user.displayName || 'User' });
            }
        };

        fetchPrefs();
    }, [user]);

    // --- HANDLERS ---

    // Wrapper to update state + firestore
    const handleUpdatePreferences = async (newPrefs: UserPreferences | ((prev: UserPreferences) => UserPreferences)) => {
        if (!user) return;

        let updatedPrefs: UserPreferences;
        if (typeof newPrefs === 'function') {
            updatedPrefs = newPrefs(preferences);
        } else {
            updatedPrefs = newPrefs;
        }

        setPreferences(updatedPrefs); // Optimistic update
        await updateUserPreferences(user.uid, updatedPrefs);

        if (updatedPrefs.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleImportData = (data: { goals: Goal[], preferences: UserPreferences }) => {
        alert("Importing legacy data is not supported in this version. Please start fresh with cloud sync!");
    };

    const handleResetData = () => {
        // In cloud version, this button might be hidden or mapped to account deletion,
        // but for now let's just do nothing or maybe sign out?
        // Let's leave it as a no-op or removed from UI if possible.
        if (confirm("This would clear local data, but your data is now in the cloud. Contact support to reset account.")) {
            // no-op
        }
    };

    const openAuthModal = (view: 'login' | 'signup' | 'forgot' | 'change' = 'login') => {
        setAuthModalView(view);
        setIsAuthModalOpen(true);
    };

    const handlePlanGenerated = async (title: string, motivation: string, deadline: string, steps: ActionStep[]) => {
        if (!user) return;

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

        try {
            await addGoal(user.uid, newGoal);
            setCurrentView('dashboard');
        } catch (e) {
            alert("Failed to save goal to cloud.");
            console.error(e);
        }
    };

    const toggleStep = async (stepId: string, goalIdOverride?: string) => {
        if (!user) return;
        const targetGoalId = goalIdOverride || selectedGoalId;
        if (!targetGoalId) return;

        // Use current state to calculate logic, then save complete object
        const goal = goals.find(g => g.id === targetGoalId);
        const step = goal?.steps.find(s => s.id === stepId);

        if (goal && step) {
            const today = getLocalDate();
            const difficultyXp = getXpForDifficulty(step.difficulty);
            let xpDelta = 0;

            if (step.frequency === Frequency.ONCE) {
                xpDelta = !step.isCompleted ? difficultyXp : -difficultyXp;
            } else {
                const isCheckedToday = (step.checkIns || []).includes(today);
                xpDelta = !isCheckedToday ? difficultyXp : -difficultyXp;
            }

            if (xpDelta !== 0) {
                const newXp = Math.max(0, (preferences.totalXp || 0) + xpDelta);
                handleUpdatePreferences(prev => ({ ...prev, totalXp: newXp }));
            }

            const updatedSteps = goal.steps.map(s => {
                if (s.id !== stepId) return s;
                const today = getLocalDate();

                if (s.frequency === Frequency.ONCE) {
                    return { ...s, isCompleted: !s.isCompleted };
                } else {
                    const checkIns = s.checkIns || [];
                    const alreadyCheckedInToday = checkIns.includes(today);
                    const newCheckIns = alreadyCheckedInToday
                        ? checkIns.filter(d => d !== today)
                        : [...checkIns, today];
                    return { ...s, checkIns: newCheckIns };
                }
            });

            const updatedGoal = {
                ...goal,
                steps: updatedSteps,
                progress: calculateProgress(updatedSteps),
                status: determineStatus(updatedSteps)
            };

            // Optimistic UI update
            setGoals(prev => prev.map(g => g.id === targetGoalId ? updatedGoal : g));

            // Cloud Save
            await updateGoal(user.uid, updatedGoal);
        }
    };

    const toggleSubStep = async (stepId: string, subStepId: string, goalIdOverride?: string) => {
        if (!user) return;
        const targetGoalId = goalIdOverride || selectedGoalId;
        if (!targetGoalId) return;

        const goal = goals.find(g => g.id === targetGoalId);
        if (!goal) return;

        const updatedSteps = goal.steps.map(step => {
            if (step.id !== stepId) return step;
            if (!step.subSteps) return step;

            const updatedSubSteps = step.subSteps.map(sub =>
                sub.id === subStepId ? { ...sub, isCompleted: !sub.isCompleted } : sub
            );

            return { ...step, subSteps: updatedSubSteps };
        });

        const updatedGoal = { ...goal, steps: updatedSteps };

        setGoals(prev => prev.map(g => g.id === targetGoalId ? updatedGoal : g));
        await updateGoal(user.uid, updatedGoal);
    };

    const handleBreakDownStep = async (stepId: string, goalIdOverride?: string) => {
        if (!user) return;
        const targetGoalId = goalIdOverride || selectedGoalId;
        if (!targetGoalId) return;

        const goal = goals.find(g => g.id === targetGoalId);
        const step = goal?.steps.find(s => s.id === stepId);
        if (!goal || !step) return;

        try {
            const subSteps = await generateSubSteps(step.title, step.description, goal.title, preferences.aiPersona);

            const updatedSteps = goal.steps.map(s => {
                if (s.id !== stepId) return s;
                return { ...s, subSteps };
            });

            const updatedGoal = { ...goal, steps: updatedSteps };
            setGoals(prev => prev.map(g => g.id === targetGoalId ? updatedGoal : g));
            await updateGoal(user.uid, updatedGoal);

        } catch (e) {
            console.error(e);
            alert("Could not break down this step. Please try again.");
        }
    };

    const handleStepDeadlineChange = async (stepId: string, newDate: string, goalIdOverride?: string) => {
        if (!user) return;
        const targetGoalId = goalIdOverride || selectedGoalId;
        if (!targetGoalId) return;

        const goal = goals.find(g => g.id === targetGoalId);
        if (!goal) return;

        const updatedSteps = goal.steps.map(step =>
            step.id === stepId ? { ...step, deadline: newDate } : step
        );

        const updatedGoal = { ...goal, steps: updatedSteps };
        setGoals(prev => prev.map(g => g.id === targetGoalId ? updatedGoal : g));
        await updateGoal(user.uid, updatedGoal);
    };

    const handleDeleteStep = async (stepId: string, goalIdOverride?: string) => {
        if (!user) return;
        const targetGoalId = goalIdOverride || selectedGoalId;
        if (!targetGoalId) return;

        const goal = goals.find(g => g.id === targetGoalId);
        if (!goal) return;

        const updatedSteps = goal.steps.filter(s => s.id !== stepId);
        const updatedGoal = {
            ...goal,
            steps: updatedSteps,
            progress: calculateProgress(updatedSteps),
            status: determineStatus(updatedSteps)
        };

        setGoals(prev => prev.map(g => g.id === targetGoalId ? updatedGoal : g));
        await updateGoal(user.uid, updatedGoal);
    };

    const handleApplyReview = async (response: ReviewResponse) => {
        if (!user || !selectedGoalId) return;
        const goal = goals.find(g => g.id === selectedGoalId);
        if (!goal) return;

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

        const updatedGoal = {
            ...goal,
            steps: updatedSteps,
            progress: calculateProgress(updatedSteps),
            status: determineStatus(updatedSteps)
        };

        setGoals(prev => prev.map(g => g.id === selectedGoalId ? updatedGoal : g));
        await updateGoal(user.uid, updatedGoal);

        setIsReviewModalOpen(false);
    };

    const handleGenerateMore = async () => {
        if (!user || !selectedGoalId) return;
        const goal = goals.find(g => g.id === selectedGoalId);
        if (!goal) return;

        setIsGeneratingMore(true);
        try {
            const newSteps = await generateMoreSteps(goal.title, goal.motivation, goal.steps, preferences.aiPersona);

            const updatedSteps = [...goal.steps, ...newSteps];
            const updatedGoal = {
                ...goal,
                steps: updatedSteps,
                progress: calculateProgress(updatedSteps),
                status: determineStatus(updatedSteps)
            };

            setGoals(prev => prev.map(g => g.id === selectedGoalId ? updatedGoal : g));
            await updateGoal(user.uid, updatedGoal);

        } catch (e) {
            console.error(e);
            alert("Failed to generate more steps. Please try again.");
        } finally {
            setIsGeneratingMore(false);
        }
    };

    const handleManualAddStep = async (stepData: Omit<ActionStep, 'id' | 'isCompleted' | 'checkIns'>) => {
        if (!user || !selectedGoalId) return;
        const goal = goals.find(g => g.id === selectedGoalId);
        if (!goal) return;

        const newStep: ActionStep = {
            id: Math.random().toString(36).substring(2, 9),
            ...stepData,
            isCompleted: false,
            checkIns: [],
            subSteps: []
        };

        const updatedSteps = [...goal.steps, newStep];
        const updatedGoal = {
            ...goal,
            steps: updatedSteps,
            progress: calculateProgress(updatedSteps),
            status: determineStatus(updatedSteps)
        };

        setGoals(prev => prev.map(g => g.id === selectedGoalId ? updatedGoal : g));
        await updateGoal(user.uid, updatedGoal);
    };

    const handleDeleteGoal = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!user) return;

        try {
            await deleteGoal(user.uid, id);
            if (selectedGoalId === id) {
                setSelectedGoalId(null);
                setCurrentView('dashboard');
            }
        } catch (e) {
            alert("Failed to delete goal");
        }
    };

    const handleConfirmDeleteGoal = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this goal permanently?')) {
            handleDeleteGoal(e, id);
        }
    };

    const handleArchiveGoal = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!user) return;

        const goal = goals.find(g => g.id === id);
        if (!goal) return;

        const updatedGoal = { ...goal, archived: true };
        // Optimistic
        setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));
        await updateGoal(user.uid, updatedGoal);

        if (selectedGoalId === id) {
            setSelectedGoalId(null);
            setCurrentView('dashboard');
        }
    };

    const handleRestoreGoal = async (id: string) => {
        if (!user) return;
        const goal = goals.find(g => g.id === id);
        if (!goal) return;

        const updatedGoal = { ...goal, archived: false };
        setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));
        await updateGoal(user.uid, updatedGoal);
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

    // --- Reorder Handlers ---
    const moveStep = async (fromIndex: number, toIndex: number) => {
        if (!user || !selectedGoalId) return;

        const goal = goals.find(g => g.id === selectedGoalId);
        if (!goal) return;

        const boundedToIndex = Math.max(0, Math.min(goal.steps.length - 1, toIndex));
        if (fromIndex === boundedToIndex) return;

        const steps = [...goal.steps];
        const [movedStep] = steps.splice(fromIndex, 1);
        steps.splice(boundedToIndex, 0, movedStep);

        const updatedGoal = { ...goal, steps };
        setGoals(prev => prev.map(g => g.id === selectedGoalId ? updatedGoal : g));
        await updateGoal(user.uid, updatedGoal);
    };

    const selectedGoal = goals.find(g => g.id === selectedGoalId);

    // Visualization Data for Dashboard
    const visibleGoals = goals.filter(g => !g.archived);
    const activeGoals = visibleGoals.filter(g => g.status !== GoalStatus.COMPLETED).length;
    const completedGoals = visibleGoals.filter(g => g.status === GoalStatus.COMPLETED).length;

    const welcomeName = preferences.displayName ? `, ${preferences.displayName}` : user?.displayName ? `, ${user.displayName.split(' ')[0]}` : '';

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200 ${currentView === 'landing' ? 'bg-white dark:bg-slate-900' : 'pb-20'}`}>

            <Navigation
                currentView={currentView}
                setCurrentView={setCurrentView}
                hasGoals={goals.length > 0 /* Use total goals to decide auth state/menu */}
                preferences={preferences}
                user={user}
                onOpenAuthModal={openAuthModal}
            />

            {currentView === 'landing' && (
                <LandingPage onGetStarted={() => {
                    if (user) {
                        setCurrentView('dashboard');
                    } else {
                        openAuthModal('signup');
                    }
                }} />
            )}

            {/* ... keeping the rest of the render logic similar ... */}

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
                            onUpdatePreferences={handleUpdatePreferences}
                            onImportData={handleImportData}
                            onResetData={handleResetData}
                            onRestoreGoal={handleRestoreGoal}
                            onDeleteGoal={(id) => handleConfirmDeleteGoal({ stopPropagation: () => { } } as React.MouseEvent, id)}
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
                                            <span className="text-xs text-slate-400">Generated by Gemini • Use arrows to reorder</span>
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
                                                                onToggle={() => toggleStep(step.id)}
                                                                onBreakDownStep={() => handleBreakDownStep(step.id)}
                                                                onDelete={() => handleDeleteStep(step.id)}
                                                                onEnterFocusMode={() => handleEnterFocusMode(step)}
                                                                onToggleSubStep={(sId, subId) => toggleSubStep(sId, subId)}
                                                                onDeadlineChange={(sId, date) => handleStepDeadlineChange(sId, date)}
                                                                onMoveToTop={() => moveStep(index, 0)}
                                                                onMoveUp={() => moveStep(index, index - 1)}
                                                                onMoveDown={() => moveStep(index, index + 1)}
                                                                onMoveToBottom={() => moveStep(index, selectedGoal.steps.length - 1)}
                                                                canMoveUp={index > 0}
                                                                canMoveDown={index < selectedGoal.steps.length - 1}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-center gap-3 mt-8">
                                                <button
                                                    onClick={() => setIsAddStepModalOpen(true)}
                                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition-colors text-sm"
                                                >
                                                    <i className="fa-solid fa-plus mr-2"></i>
                                                    Add Manually
                                                </button>
                                                <button
                                                    disabled={isGeneratingMore}
                                                    onClick={handleGenerateMore}
                                                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium transition-colors text-sm flex items-center"
                                                >
                                                    {isGeneratingMore ? (
                                                        <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Thinking...</>
                                                    ) : (
                                                        <><i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Suggest More</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {activeFocusStep && (
                                <FocusMode
                                    step={activeFocusStep}
                                    onComplete={handleCompleteFocusMode}
                                    onClose={() => setActiveFocusStep(null)}
                                />
                            )}

                            {isAddStepModalOpen && (
                                <AddStepModal
                                    onClose={() => setIsAddStepModalOpen(false)}
                                    onAdd={handleManualAddStep}
                                />
                            )}

                            {isReviewModalOpen && selectedGoal && (
                                <WeeklyReviewModal
                                    isOpen={isReviewModalOpen}
                                    onClose={() => setIsReviewModalOpen(false)}
                                    goal={selectedGoal}
                                    aiPersona={preferences.aiPersona}
                                    onApplyPlan={handleApplyReview}
                                />
                            )}
                        </div>
                    )}
                </main>
            )}

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                defaultView={authModalView}
                onAuthSuccess={() => setCurrentView('dashboard')}
                user={user}
            />
        </div>
    );
}