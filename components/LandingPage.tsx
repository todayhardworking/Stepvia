import React from 'react';
import { GoalCard } from './GoalCard';
import { Goal, GoalStatus, Frequency, Difficulty } from '../types';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  // Mock goal for the visual preview
  const demoGoal: Goal = {
    id: 'demo',
    title: 'Run a Half Marathon',
    motivation: 'To prove to myself that I can push my physical limits and get healthier.',
    createdAt: new Date().toISOString(),
    status: GoalStatus.IN_PROGRESS,
    progress: 45,
    deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
    steps: [
        { id: '1', title: 'Buy running shoes', description: 'Go to a specialist store.', estimatedTime: '1h', difficulty: Difficulty.EASY, frequency: Frequency.ONCE, isCompleted: true, checkIns: [] },
        { id: '2', title: 'Morning Jog', description: 'Run 5km at easy pace.', estimatedTime: '30m', difficulty: Difficulty.MEDIUM, frequency: Frequency.DAILY, isCompleted: false, checkIns: [] },
    ]
  };

  return (
    <div className="bg-white w-full animate-fade-in">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full z-0 pointer-events-none">
             <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4"></div>
             <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-50 rounded-full blur-3xl opacity-50 translate-y-1/4 -translate-x-1/4"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold uppercase tracking-wide mb-6 animate-scale-in">
                <i className="fa-solid fa-sparkles mr-2"></i>
                Powered by Gemini 2.5
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
                Turn your ambitions into <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">actionable steps.</span>
            </h1>
            
            <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-500 mb-10">
                Overwhelmed by big goals? Stepvia breaks them down into a clear, guided route so you can stop planning and start doing.
            </p>
            
            <div className="flex justify-center gap-4 mb-16">
                <button 
                    onClick={onGetStarted}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-indigo-200 transition-all transform hover:-translate-y-1 hover:scale-105 flex items-center"
                >
                    Build My First Plan
                    <i className="fa-solid fa-arrow-right ml-2"></i>
                </button>
            </div>

            {/* Visual Proof / Demo Card */}
            <div className="relative max-w-md mx-auto transform rotate-2 hover:rotate-0 transition-transform duration-500 cursor-default">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-30 blur-lg"></div>
                <div className="relative bg-white rounded-xl shadow-2xl pointer-events-none text-left">
                     {/* We use a simplified version of the card structure or the actual component */}
                     <GoalCard 
                        goal={demoGoal} 
                        onClick={() => {}} 
                        onDelete={() => {}} 
                        onArchive={() => {}} 
                     />
                </div>
                
                {/* Floating Badge 1 */}
                <div className="absolute -right-12 top-10 bg-white p-3 rounded-lg shadow-lg border border-slate-100 flex items-center gap-3 animate-bounce-slow hidden md:flex">
                     <div className="bg-green-100 p-2 rounded-full text-green-600">
                         <i className="fa-solid fa-check"></i>
                     </div>
                     <div>
                         <p className="text-xs text-slate-400 font-medium">Daily Streak</p>
                         <p className="text-sm font-bold text-slate-800">5 Days 🔥</p>
                     </div>
                </div>

                {/* Floating Badge 2 */}
                <div className="absolute -left-12 bottom-10 bg-white p-3 rounded-lg shadow-lg border border-slate-100 flex items-center gap-3 animate-bounce-slow delay-700 hidden md:flex">
                     <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                         <i className="fa-solid fa-brain"></i>
                     </div>
                     <div>
                         <p className="text-xs text-slate-400 font-medium">AI Coach</p>
                         <p className="text-sm font-bold text-slate-800">Plan Generated</p>
                     </div>
                </div>
            </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-slate-50 py-20 border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-slate-800">Your route to transformation</h2>
                  <p className="text-slate-500 mt-4">Simple, effective, and guided by intelligence.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {/* Card 1: Why Stepvia */}
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-xl mb-6">
                          <i className="fa-solid fa-shoe-prints"></i>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">Why the name Stepvia?</h3>
                      <p className="text-slate-500 leading-relaxed">
                          Stepvia blends “step” and “via” (Latin: path). It is a promise that every small action moves you along a clear, guided route toward meaningful transformation.
                      </p>
                  </div>

                  {/* Card 2: Set targets */}
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 text-xl mb-6">
                          <i className="fa-solid fa-bullseye"></i>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">Set targets</h3>
                      <p className="text-slate-500 leading-relaxed">
                          Define clear goals for your week or quarter. Keep them visible so every action has intent.
                      </p>
                  </div>

                  {/* Card 3: Take daily actions */}
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 text-xl mb-6">
                          <i className="fa-solid fa-calendar-check"></i>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">Take daily actions</h3>
                      <p className="text-slate-500 leading-relaxed">
                          Break goals into small, confident steps. Capture progress.
                      </p>
                  </div>
              </div>
          </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-slate-400 text-sm">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                  <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">S</div>
                  <span className="font-semibold text-slate-600">Stepvia</span>
              </div>
              <p>&copy; {new Date().getFullYear()} Stepvia. All rights reserved.</p>
          </div>
      </footer>
    </div>
  );
};