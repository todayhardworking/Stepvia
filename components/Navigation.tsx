import React, { useState, useEffect } from 'react';
import { UserPreferences } from '../types';
import { User } from 'firebase/auth';
import { signInWithGoogle, logout } from '../services/authService';

interface NavigationProps {
  currentView: 'landing' | 'dashboard' | 'create' | 'detail' | 'daily' | 'preferences' | 'about';
  setCurrentView: (view: 'landing' | 'dashboard' | 'create' | 'detail' | 'daily' | 'preferences' | 'about') => void;
  hasGoals: boolean;
  preferences: UserPreferences;
  user: User | null;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setCurrentView, hasGoals, preferences, user }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close drawer when view changes
  useEffect(() => {
    setIsOpen(false);
  }, [currentView]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const showLoggedInMenu = !!user;

  const currentLevel = Math.floor((preferences.totalXp || 0) / 100) + 1;

  const NavItem = ({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active?: boolean }) => (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-full transition-colors mb-1
        ${active
          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
        }`}
    >
      <i className={`${icon} w-6 text-center mr-3 text-lg`}></i>
      {label}
    </button>
  );

  return (
    <>
      {/* --- Top App Bar --- */}
      <header className={`sticky top-0 z-40 w-full transition-all duration-200 ${currentView === 'landing'
          ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-transparent'
          : 'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'
        }`}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
              aria-label="Open menu"
            >
              <i className="fa-solid fa-bars text-xl"></i>
            </button>

            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setCurrentView(showLoggedInMenu ? 'dashboard' : 'landing')}
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-indigo-700 transition-colors">
                S
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-white hidden sm:block">Stepvia</span>
            </div>
          </div>

          {/* Right: Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {!showLoggedInMenu ? (
              <>
                <button onClick={() => setCurrentView('about')} className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">About</button>
                <button
                  onClick={signInWithGoogle}
                  id="nav-login-btn"
                  className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                  Get Started
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${currentView === 'dashboard' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('daily')}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${currentView === 'daily' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  Daily Check-ins
                </button>
                <button
                  onClick={() => setCurrentView('create')}
                  className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                  New Goal
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <button
                  onClick={() => setCurrentView('preferences')}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors relative
                        ${currentView === 'preferences'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  title="Preferences"
                >
                  <i className="fa-solid fa-gear text-xs"></i>
                </button>
                <button
                  onClick={logout}
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors"
                  title="Logout"
                >
                  <i className="fa-solid fa-right-from-bracket text-xs"></i>
                </button>
              </>
            )}
          </div>

          {/* Mobile Right: Contextual Action */}
          <div className="md:hidden">
            {showLoggedInMenu ? (
              currentView !== 'create' && (
                <button
                  onClick={() => setCurrentView('create')}
                  className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center active:bg-indigo-100 dark:active:bg-indigo-800"
                >
                  <i className="fa-solid fa-plus text-sm"></i>
                </button>
              )
            ) : (
              <button
                onClick={signInWithGoogle}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-sm active:scale-95 transition-transform"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* --- Mobile Drawer Overlay (Backdrop) --- */}
      <div
        className={`fixed inset-0 bg-slate-900/40 z-50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* --- Mobile Drawer Panel --- */}
      <div className={`fixed top-0 bottom-0 left-0 w-[80%] max-w-[320px] bg-white dark:bg-slate-900 z-50 shadow-2xl transform transition-transform duration-300 ease-out rounded-r-2xl overflow-hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">S</div>
            <span className="font-bold text-lg text-slate-800 dark:text-white">Stepvia</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          {!showLoggedInMenu ? (
            /* Logged Out Menu */
            <div className="space-y-1">
              <NavItem icon="fa-solid fa-house" label="Home" onClick={() => setCurrentView('landing')} active={currentView === 'landing'} />
              <NavItem icon="fa-solid fa-circle-info" label="About Stepvia" onClick={() => setCurrentView('about')} active={currentView === 'about'} />

              <div className="my-6 mx-2 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">Ready to start?</h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-3">Break down your goals today.</p>
                <button
                  onClick={signInWithGoogle}
                  className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm active:scale-95 transition-transform"
                >
                  Get Started
                </button>
              </div>
            </div>
          ) : (
            /* Logged In Menu */
            <div className="space-y-1">
              {/* User Profile Summary */}
              <div className="mb-6 px-4 py-4 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-2xl text-white shadow-lg mx-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl">
                  <i className="fa-solid fa-trophy"></i>
                </div>

                <div className="flex items-center gap-3 mb-3 relative z-10">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-white/20" />
                  ) : (
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/20">
                      <i className="fa-solid fa-user"></i>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold truncate max-w-[150px]">{preferences.displayName || user?.displayName || 'Friend'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-bold bg-amber-400 text-amber-900 px-1.5 py-px rounded">Lvl {currentLevel}</span>
                      <p className="text-xs text-slate-300">{preferences.totalXp || 0} XP</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('create')}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors border border-white/10 relative z-10"
                >
                  + Quick Goal
                </button>
              </div>

              <div className="px-2 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Menu</div>
              <NavItem icon="fa-solid fa-chart-pie" label="Dashboard" onClick={() => setCurrentView('dashboard')} active={currentView === 'dashboard'} />
              <NavItem icon="fa-solid fa-list-check" label="Daily Check-ins" onClick={() => setCurrentView('daily')} active={currentView === 'daily'} />
              <NavItem icon="fa-solid fa-plus" label="Create New Goal" onClick={() => setCurrentView('create')} active={currentView === 'create'} />

              <div className="my-4 border-t border-slate-100 dark:border-slate-800 mx-2"></div>

              <div className="px-2 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Settings</div>
              <NavItem icon="fa-solid fa-gear" label="Preferences" onClick={() => setCurrentView('preferences')} active={currentView === 'preferences'} />
              <NavItem icon="fa-solid fa-circle-info" label="About Stepvia" onClick={() => setCurrentView('about')} active={currentView === 'about'} />
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {showLoggedInMenu && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={logout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <i className="fa-solid fa-right-from-bracket w-6 text-center mr-3"></i>
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  );
};