import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserAccount } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Hash password with SHA-256 for secure client transmission/storage
  const hashPassword = async (pass: string) => {
    const salt = "cinematch_salt_91";
    const msgBuffer = new TextEncoder().encode(salt + pass);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLoginTab) {
        // Login flow
        if (!username.trim() || !password) {
          throw new Error('Please enter both username/email and password.');
        }

        const passHash = await hashPassword(password);
        const savedUsersRaw = localStorage.getItem('cinematch_users') || '[]';
        const savedUsers = JSON.parse(savedUsersRaw);

        const match = savedUsers.find(
          (u: any) =>
            (u.username.toLowerCase() === username.trim().toLowerCase() ||
             u.email.toLowerCase() === username.trim().toLowerCase()) &&
            u.passwordHash === passHash
        );

        if (!match) {
          throw new Error('Invalid credentials. Check your username and password.');
        }

        const userObj: UserAccount = {
          id: match.id,
          username: match.username,
          email: match.email,
          theme_preference: match.theme_preference || 'dark',
        };

        setSuccess('Logged in successfully!');
        setTimeout(() => {
          onLoginSuccess(userObj);
          onClose();
        }, 600);

      } else {
        // Register flow
        if (username.trim().length < 3) {
          throw new Error('Username must be at least 3 characters.');
        }
        if (!email.includes('@') || !email.includes('.')) {
          throw new Error('Please enter a valid email address.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const passHash = await hashPassword(password);
        const savedUsersRaw = localStorage.getItem('cinematch_users') || '[]';
        const savedUsers = JSON.parse(savedUsersRaw);

        if (savedUsers.some((u: any) => u.username.toLowerCase() === username.trim().toLowerCase())) {
          throw new Error('Username is already taken. Please choose another.');
        }
        if (savedUsers.some((u: any) => u.email.toLowerCase() === email.trim().toLowerCase())) {
          throw new Error('An account with this email already exists.');
        }

        const newUser = {
          id: Date.now(),
          username: username.trim(),
          email: email.trim().toLowerCase(),
          passwordHash: passHash,
          theme_preference: 'dark',
          created_at: new Date().toISOString()
        };

        savedUsers.push(newUser);
        localStorage.setItem('cinematch_users', JSON.stringify(savedUsers));

        const userObj: UserAccount = {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          theme_preference: 'dark'
        };

        setSuccess('Account created! Welcome to CineMatch.');
        setTimeout(() => {
          onLoginSuccess(userObj);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-zinc-100 light:bg-white light:border-zinc-200 light:text-zinc-900">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer light:hover:text-zinc-900"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold tracking-tight">
            {isLoginTab ? 'Sign in to CineMatch' : 'Create an Account'}
          </h2>
          <p className="text-xs text-zinc-400 light:text-zinc-600 mt-1">
            {isLoginTab
              ? 'Access your personal favorites, watchlist, and custom recommendations'
              : 'Join to save your favorite movies and maintain personalized queues'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 light:border-zinc-200 mb-6">
          <button
            type="button"
            onClick={() => { setIsLoginTab(true); setError(null); }}
            className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              isLoginTab
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 light:text-zinc-500'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsLoginTab(false); setError(null); }}
            className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              !isLoginTab
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 light:text-zinc-500'
            }`}
          >
            Register
          </button>
        </div>

        {/* Feedback Alert */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1">
              Username
            </label>
            <div className="relative flex items-center">
              <UserIcon className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. cinephile99"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
              />
            </div>
          </div>

          {!isLoginTab && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600 mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLoginTab ? "••••••••" : "Minimum 6 characters"}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none light:bg-zinc-50 light:border-zinc-300 light:text-zinc-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
          >
            {loading ? 'Authenticating...' : isLoginTab ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-zinc-500">
            Passwords are salted and cryptographically hashed with SHA-256. Never stored in plaintext.
          </p>
        </div>
      </div>
    </div>
  );
};
