'use client';

import { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);

  // Auto-detect if user exists
  useEffect(() => {
    if (email && email.includes('@')) {
      checkUserExists();
    }
  }, [email]);

  const checkUserExists = async () => {
    try {
      const res = await fetch('/api/webauthn/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setUserExists(data.exists);
      setMode(data.exists ? 'signin' : 'register');
    } catch (err) {
      // Silent fail, don't reveal errors
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError('');

      const optionsRes = await fetch('/api/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!optionsRes.ok) {
        const errorData = await optionsRes.text();
        throw new Error(errorData || 'Failed to get registration options');
      }

      const options = await optionsRes.json();
      const attResp = await startRegistration(options);

      const verifyRes = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, response: attResp }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.text();
        throw new Error(errorData || 'Failed to verify registration');
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      const optionsRes = await fetch('/api/webauthn/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!optionsRes.ok) {
        const errorData = await optionsRes.text();
        throw new Error(errorData || 'Failed to get authentication options');
      }

      const options = await optionsRes.json();
      const assertionResp = await startAuthentication(options);

      const verifyRes = await fetch('/api/webauthn/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, response: assertionResp }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.text();
        throw new Error(errorData || 'Failed to verify authentication');
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }
    if (mode === 'register') {
      handleRegister();
    } else {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {success ? '✓ Success!' : mode === 'register' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {mode === 'register' 
              ? 'Register with your device\'s biometric authentication' 
              : 'Sign in with your passkey'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {userExists !== null && !error && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {userExists 
                  ? '✓ Account found - use your passkey to sign in'
                  : '→ New user detected - create your passkey'}
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || success || !email}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : success ? (
                '✓ Success!'
              ) : mode === 'register' ? (
                '🔐 Create Passkey'
              ) : (
                '🔓 Sign In with Passkey'
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              ← Back to home
            </Link>
            
            {!loading && !success && userExists === false && (
              <button
                type="button"
                onClick={() => setMode(mode === 'register' ? 'signin' : 'register')}
                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                {mode === 'register' ? 'Already have an account?' : 'Need an account?'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
