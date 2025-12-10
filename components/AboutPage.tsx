import React from 'react';

interface AboutPageProps {
  onBack: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-12">
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">About Stepvia</h1>
      </div>

      <div className="grid gap-8">
        {/* Name Origin Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl">
              <i className="fa-solid fa-signature"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">The Name Origin</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
            <p className="text-lg leading-relaxed mb-4">
              <strong className="text-indigo-600 dark:text-indigo-400">Stepvia</strong> is a portmanteau born from a simple philosophy.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 my-8">
              <div className="flex-1 bg-slate-50 dark:bg-slate-700/30 p-6 rounded-xl border border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">"Step"</h3>
                <p className="text-sm">Represents the atomic unit of progress. Small, manageable actions that compound over time.</p>
              </div>
              <div className="flex items-center justify-center text-slate-300 dark:text-slate-600">
                <i className="fa-solid fa-plus text-xl"></i>
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-slate-700/30 p-6 rounded-xl border border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">"Via"</h3>
                <p className="text-sm">Latin for "road" or "way". It signifies the journey, the method, and the direction toward your destination.</p>
              </div>
            </div>
            <p>
              Together, they form <strong>Stepvia</strong>: <em>The path made by walking.</em> It reflects our belief that ambitions are achieved not by giant leaps, but by a consistent series of steps along a clear path.
            </p>
          </div>
        </div>

        {/* Core Features */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Core Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">AI-Powered Breakdown</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Uses Google's Gemini 2.5 Flash to deconstruct vague goals into concrete, scheduled action plans tailored to your motivation.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-trophy"></i>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Gamification System</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Earn XP, level up, and unlock specialized AI coaching personas (like the Drill Sergeant) as you complete tasks.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-crosshairs"></i>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Deep Focus Mode</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">A distraction-free timer interface for executing tasks, helping you enter a flow state immediately.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-clipboard-check"></i>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Weekly Reviews</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Intelligent retrospective sessions where the AI analyzes your progress and adjusts your schedule dynamically.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white text-2xl border border-white/10">
              <i className="fa-solid fa-code"></i>
            </div>
            <h2 className="text-2xl font-bold">Technology Stack</h2>
          </div>
          <p className="text-slate-300 mb-8">
            Stepvia is built with a focus on performance, interactivity, and intelligent data processing.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
              <i className="fa-brands fa-react text-3xl mb-3 text-cyan-400"></i>
              <div className="font-bold text-sm">React 19</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
              <i className="fa-brands fa-google text-3xl mb-3 text-white"></i>
              <div className="font-bold text-sm">Gemini API</div>
            </div>
             <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
              <i className="fa-solid fa-wind text-3xl mb-3 text-sky-400"></i>
              <div className="font-bold text-sm">Tailwind CSS</div>
            </div>
             <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
              <i className="fa-solid fa-fire text-3xl mb-3 text-orange-500"></i>
              <div className="font-bold text-sm">Firestore</div>
            </div>
          </div>
        </div>

         <div className="text-center text-slate-400 text-sm mt-4">
            Created with <i className="fa-solid fa-heart text-red-400 mx-1"></i> to help you achieve more.
         </div>
         
         <div className="flex justify-center gap-6 mt-2 text-xs text-slate-400 dark:text-slate-500">
            <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms of Service</a>
         </div>

      </div>
    </div>
  );
};