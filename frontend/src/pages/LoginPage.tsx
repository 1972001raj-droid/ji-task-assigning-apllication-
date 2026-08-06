import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';
import { LogIn, Lock, User, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) return;

    setLoading(true);
    setError(null);
    try {
      await login({
        username_or_email: usernameOrEmail,
        password,
      });
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--bg-primary)] relative overflow-hidden">
      {/* ── Animated Background Orbs ── */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[var(--accent-orange)] opacity-[0.07] blur-[100px] animate-float" />
      <div className="absolute top-1/2 -right-20 w-[400px] h-[400px] rounded-full bg-[var(--accent-blue)] opacity-[0.06] blur-[100px]" style={{ animationDelay: '1s' }} />
      <div className="absolute -bottom-32 left-1/3 w-[350px] h-[350px] rounded-full bg-[var(--accent-green)] opacity-[0.06] blur-[100px]" style={{ animationDelay: '2s' }} />

      {/* ── Login Card ── */}
      <div className="w-full max-w-md glass-panel p-8 shadow-2xl relative z-10 animate-slide-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-gradient)] text-white font-black text-2xl flex items-center justify-center mx-auto mb-4 shadow-xl glow-animation">
            JI
          </div>
          <h1 className="text-2xl font-extrabold text-gradient-orange">
            Project Hub
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-xs mx-auto">
            Sign in to your enterprise project management workspace
          </p>

          {/* ── Color accent dots ── */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-orange)] shadow-[0_0_8px_var(--accent-orange-glow)]" />
            <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)] shadow-[0_0_8px_var(--accent-blue-glow)]" />
            <div className="w-2 h-2 rounded-full bg-[var(--accent-green)] shadow-[0_0_8px_var(--accent-green-glow)]" />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5 animate-fade-in">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
              <input
                type="text"
                required
                placeholder="admin@example.com"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="input-field pl-10 py-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10 py-2.5"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[var(--accent-gradient)] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={16} />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* ── Footer ── */}
        <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-center space-y-2">
          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-[var(--accent-orange)]">
            <Sparkles size={11} />
            Cookie Session & CSRF Security
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            FastAPI Backend &middot; <code className="text-[var(--accent-blue)]">localhost:8000/api/v1</code>
          </div>
        </div>
      </div>
    </div>
  );
};
