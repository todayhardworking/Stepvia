import React, { useState, useEffect } from 'react';
import { ActionStep } from '../types';

interface FocusModeProps {
  step: ActionStep;
  onComplete: () => void;
  onClose: () => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({ step, onComplete, onClose }) => {
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60); // Default 25 mins
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState<number>(25 * 60);

  // Parse estimated time string to seconds
  useEffect(() => {
    if (step.estimatedTime) {
      const timeStr = step.estimatedTime.toLowerCase();
      let minutes = 0;
      
      // Extract numbers
      const numbers = timeStr.match(/\d+/);
      if (numbers) {
        const val = parseInt(numbers[0]);
        if (timeStr.includes('hour') || timeStr.includes('hr')) {
          minutes = val * 60;
        } else {
          minutes = val;
        }
      } else {
        minutes = 25; // Default if no number found
      }

      setTimeLeft(minutes * 60);
      setInitialTime(minutes * 60);
    }
  }, [step]);

  useEffect(() => {
    let interval: number;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((initialTime - timeLeft) / initialTime) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-900 animate-fade-in">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-50 dark:bg-purple-900/10 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg px-6 text-center">
        <button 
          onClick={onClose}
          className="absolute top-[-80px] right-6 p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
        >
          <i className="fa-solid fa-xmark text-2xl"></i>
        </button>

        <div className="mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
            Deep Focus Mode
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white mb-4 leading-tight">
            {step.title}
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            {step.description}
          </p>
        </div>

        {/* Timer Circle */}
        <div className="relative w-64 h-64 mx-auto mb-12">
          {/* SVG Progress Circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-100 dark:text-slate-800"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
              className="text-indigo-600 dark:text-indigo-500 transition-all duration-1000 ease-linear"
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl font-mono font-bold text-slate-800 dark:text-white tracking-tighter">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm font-medium text-slate-400 mt-2 uppercase tracking-wide">
              {isActive ? 'Focusing' : 'Paused'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-12">
           <button
            onClick={resetTimer}
            className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            title="Reset Timer"
           >
             <i className="fa-solid fa-rotate-right"></i>
           </button>

           <button
            onClick={toggleTimer}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white shadow-xl transition-all transform hover:scale-105 active:scale-95
              ${isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
           >
             <i className={`fa-solid ${isActive ? 'fa-pause' : 'fa-play pl-1'}`}></i>
           </button>

           <button
             onClick={onComplete}
             className="w-12 h-12 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all"
             title="Mark Complete"
           >
             <i className="fa-solid fa-check text-xl"></i>
           </button>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
          "The path to success is to take massive, determined action."
        </p>
      </div>
    </div>
  );
};