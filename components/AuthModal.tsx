import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  changePassword,
  loginWithEmail,
  requestPasswordReset,
  signInWithGoogle,
  signUpWithEmail,
} from '../services/authService';

type AuthView = 'login' | 'signup' | 'forgot' | 'change';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  defaultView?: AuthView;
  user: User | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess, defaultView = 'login', user }) => {
  const [view, setView] = useState<AuthView>(defaultView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView(defaultView);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setStatusMessage('');
      setErrorMessage('');
    }
  }, [isOpen, defaultView]);

  const handleEmailLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      await loginWithEmail(email, password);
      setStatusMessage('Logged in successfully.');
      onAuthSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to log in.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      await signUpWithEmail(email, password);
      setStatusMessage('Account created successfully.');
      onAuthSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      await requestPasswordReset(email);
      setStatusMessage('Password reset email sent. Check your inbox.');
      setView('login');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) {
      setErrorMessage('You need to be logged in to change your password.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      await changePassword(currentPassword, password);
      setStatusMessage('Password updated successfully.');
      setView('login');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      await signInWithGoogle();
      setStatusMessage('Logged in successfully.');
      onAuthSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderFooterLinks = () => {
    if (view === 'login') {
      return (
        <div className="flex justify-between text-sm text-indigo-600 font-medium">
          <button onClick={() => setView('forgot')} className="hover:underline">Forgot password?</button>
          <button onClick={() => setView('signup')} className="hover:underline">Create account</button>
        </div>
      );
    }

    if (view === 'signup') {
      return (
        <div className="text-sm text-center text-slate-500">
          Already have an account?{' '}
          <button onClick={() => setView('login')} className="text-indigo-600 font-semibold hover:underline">Log in</button>
        </div>
      );
    }

    return (
      <div className="text-sm text-center text-slate-500">
        <button onClick={() => setView('login')} className="text-indigo-600 font-semibold hover:underline">Back to login</button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold">S</div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Stepvia</p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {view === 'signup' && 'Create your account'}
              {view === 'login' && 'Welcome back'}
              {view === 'forgot' && 'Reset your password'}
              {view === 'change' && 'Change password'}
            </h2>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">
            {statusMessage}
          </div>
        )}

        {(view === 'login' || view === 'signup' || view === 'forgot') && (
          <div className="space-y-3 mb-4">
            <label className="block">
              <span className="text-sm text-slate-600 dark:text-slate-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </label>

            {view !== 'forgot' && (
              <label className="block">
                <span className="text-sm text-slate-600 dark:text-slate-300">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </label>
            )}

            {view === 'signup' && (
              <label className="block">
                <span className="text-sm text-slate-600 dark:text-slate-300">Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </label>
            )}
          </div>
        )}

        {view === 'change' && (
          <div className="space-y-3 mb-4">
            <label className="block">
              <span className="text-sm text-slate-600 dark:text-slate-300">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600 dark:text-slate-300">New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600 dark:text-slate-300">Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </label>
          </div>
        )}

        <div className="space-y-3">
          {view === 'login' && (
            <button
              onClick={handleEmailLogin}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          )}

          {view === 'signup' && (
            <button
              onClick={handleEmailSignUp}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          )}

          {view === 'forgot' && (
            <button
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? 'Sending email...' : 'Send reset email'}
            </button>
          )}

          {view === 'change' && (
            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? 'Updating password...' : 'Update password'}
            </button>
          )}

          {(view === 'login' || view === 'signup') && (
            <>
              <div className="flex items-center gap-3 text-slate-400">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                <span className="text-xs uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <i className="fa-brands fa-google"></i>
                Continue with Google
              </button>
            </>
          )}

          {renderFooterLinks()}

          {user && view !== 'change' && (
            <button
              onClick={() => setView('change')}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Change your password
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
