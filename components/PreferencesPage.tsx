import React, { useRef } from 'react';
import { UserPreferences, AIPersona, Goal } from '../types';

interface PreferencesPageProps {
  preferences: UserPreferences;
  goals: Goal[];
  onUpdatePreferences: (newPrefs: UserPreferences) => void;
  onImportData: (data: { goals: Goal[], preferences: UserPreferences }) => void;
  onResetData: () => void;
  onRestoreGoal: (id: string) => void;
  onDeleteGoal: (id: string) => void;
}

export const PreferencesPage: React.FC<PreferencesPageProps> = ({ 
    preferences, 
    goals,
    onUpdatePreferences,
    onImportData,
    onResetData,
    onRestoreGoal,
    onDeleteGoal
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdatePreferences({ ...preferences, displayName: e.target.value });
  };

  const handleToggleDarkMode = () => {
    onUpdatePreferences({ ...preferences, darkMode: !preferences.darkMode });
  };

  const handlePersonaChange = (persona: AIPersona) => {
    // Prevent changing if locked
    if (isLocked(persona)) return;
    onUpdatePreferences({ ...preferences, aiPersona: persona });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify({ goals, preferences }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stepvia_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            onImportData(json);
        } catch (err) {
            alert("Invalid JSON file or corrupted data.");
        }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again if needed
    e.target.value = '';
  };

  const handleResetConfirm = () => {
    if (window.confirm("Are you sure? This will delete all goals and reset preferences. This action cannot be undone.")) {
        onResetData();
    }
  };

  const archivedGoals = goals.filter(g => g.archived);

  // Level Logic
  const currentXp = preferences.totalXp || 0;
  const currentLevel = Math.floor(currentXp / 100) + 1;
  const nextLevelXp = currentLevel * 100;
  const currentLevelStartXp = (currentLevel - 1) * 100;
  const progressPercent = ((currentXp - currentLevelStartXp) / 100) * 100;

  const isLocked = (persona: AIPersona) => {
      if (persona === AIPersona.DRILL_SERGEANT) return currentLevel < 5;
      if (persona === AIPersona.ANALYTICAL) return currentLevel < 10;
      return false;
  };

  const getLockMessage = (persona: AIPersona) => {
      if (persona === AIPersona.DRILL_SERGEANT) return "Unlocks at Level 5";
      if (persona === AIPersona.ANALYTICAL) return "Unlocks at Level 10";
      return "";
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Preferences</h1>
        <p className="text-slate-500 dark:text-slate-400">Customize your Stepvia experience and manage your data.</p>
      </div>

      <div className="space-y-6">
        
        {/* Profile Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <i className="fa-solid fa-user-circle mr-3 text-indigo-500"></i>
                Profile Settings
            </h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Display Name
                    </label>
                    <input
                        type="text"
                        value={preferences.displayName}
                        onChange={handleChangeName}
                        placeholder="What should we call you?"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all"
                    />
                    <p className="text-xs text-slate-400 mt-2">This name will be displayed in your daily greeting.</p>
                </div>
            </div>
        </div>

        {/* Level & XP Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">
                <i className="fa-solid fa-trophy"></i>
            </div>
            
            <div className="flex justify-between items-end mb-2 relative z-10">
                <div>
                    <span className="text-indigo-100 text-sm font-semibold uppercase tracking-wider">Current Rank</span>
                    <h2 className="text-3xl font-bold">Level {currentLevel}</h2>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold">{currentXp}</span>
                    <span className="text-indigo-200 text-sm ml-1">XP</span>
                </div>
            </div>

            <div className="w-full bg-black/20 rounded-full h-3 mb-2 overflow-hidden relative z-10">
                <div 
                    className="bg-white h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-xs text-indigo-100 relative z-10">
                <span>{Math.floor(progressPercent)}% to next level</span>
                <span>{nextLevelXp - currentXp} XP needed</span>
            </div>
            
            <p className="mt-4 text-xs text-indigo-100 border-t border-white/10 pt-3">
                <i className="fa-solid fa-circle-info mr-1.5"></i>
                Earn XP by completing tasks. Harder tasks grant more XP.
            </p>
        </div>

        {/* AI Persona Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <i className="fa-solid fa-brain mr-3 text-indigo-500"></i>
                AI Coach Persona
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Unlock specialized AI coaches as you level up your productivity.
            </p>

            <div className="grid gap-4">
                {[
                    { 
                        id: AIPersona.MOTIVATIONAL, 
                        icon: 'fa-hand-holding-heart', 
                        label: 'Motivational (Default)', 
                        desc: 'Encouraging, positive, and supportive. Focuses on progress.' 
                    },
                    { 
                        id: AIPersona.DRILL_SERGEANT, 
                        icon: 'fa-person-military-pointing', 
                        label: 'Drill Sergeant', 
                        desc: 'Strict, direct, and no-nonsense. Demands excellence and discipline.' 
                    },
                    { 
                        id: AIPersona.ANALYTICAL, 
                        icon: 'fa-chart-network', 
                        label: 'Analytical', 
                        desc: 'Logical, data-driven, and efficient. Focuses on optimization.' 
                    }
                ].map((persona) => {
                    const locked = isLocked(persona.id);
                    return (
                        <div 
                            key={persona.id}
                            onClick={() => handlePersonaChange(persona.id)}
                            className={`relative flex items-center p-4 rounded-xl border transition-all duration-200
                            ${preferences.aiPersona === persona.id 
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                                : locked
                                    ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 opacity-70 cursor-not-allowed'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-500 cursor-pointer'
                            }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mr-4
                                ${preferences.aiPersona === persona.id ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                <i className={`fa-solid ${persona.icon}`}></i>
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-bold flex items-center ${preferences.aiPersona === persona.id ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-white'}`}>
                                    {persona.label}
                                    {locked && (
                                        <span className="ml-2 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                            Locked
                                        </span>
                                    )}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{persona.desc}</p>
                            </div>
                            
                            {preferences.aiPersona === persona.id && !locked && (
                                <div className="absolute top-4 right-4 text-indigo-600 dark:text-indigo-400">
                                    <i className="fa-solid fa-circle-check text-xl"></i>
                                </div>
                            )}

                            {locked && (
                                <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                                    <div className="bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                        <i className="fa-solid fa-lock text-slate-400 text-xs"></i>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{getLockMessage(persona.id)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <i className="fa-solid fa-palette mr-3 text-indigo-500"></i>
                Appearance
            </h2>
            
            <div className="flex items-center justify-between">
                <div>
                    <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Dark Mode</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Easier on the eyes in low light.</span>
                </div>
                
                <button 
                    onClick={handleToggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                    ${preferences.darkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                >
                    <span 
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
                        ${preferences.darkMode ? 'translate-x-6' : 'translate-x-1'}`} 
                    />
                </button>
            </div>
        </div>

        {/* Data Management Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <i className="fa-solid fa-database mr-3 text-indigo-500"></i>
                Data Management
            </h2>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={handleExport}
                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm flex items-center justify-center"
                    >
                        <i className="fa-solid fa-download mr-2"></i>
                        Export Data (JSON)
                    </button>
                    
                    <button 
                        onClick={handleImportClick}
                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm flex items-center justify-center"
                    >
                        <i className="fa-solid fa-upload mr-2"></i>
                        Import Data
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".json" 
                        className="hidden" 
                    />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button 
                        onClick={handleResetConfirm}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium flex items-center"
                    >
                        <i className="fa-solid fa-trash-can mr-2"></i>
                        Reset All Data (Danger Zone)
                    </button>
                </div>
            </div>
        </div>

        {/* Archived Goals Section */}
        {archivedGoals.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <i className="fa-solid fa-box-archive mr-3 text-indigo-500"></i>
                    Archived Goals
                </h2>

                <div className="space-y-3">
                    {archivedGoals.map(goal => (
                        <div key={goal.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div>
                                <p className="font-medium text-slate-800 dark:text-white text-sm">{goal.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Created: {new Date(goal.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => onRestoreGoal(goal.id)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded transition-colors text-xs font-medium"
                                    title="Restore"
                                >
                                    Restore
                                </button>
                                <button 
                                    onClick={() => {
                                        if(window.confirm('Delete permanently?')) onDeleteGoal(goal.id);
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                                    title="Delete Permanently"
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};