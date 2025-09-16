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

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError('');

      const optionsRes = await fetch('/api/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!optionsRes.ok) throw new Error('Failed to get registration options');

      const options = await optionsRes.json();
      const attResp = await startRegistration(options);

      const verifyRes = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, response: attResp }),
      });

      if (!verifyRes.ok) throw new Error('Failed to verify registration');

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

      if (!optionsRes.ok) throw new Error('Failed to get authentication options');

      const options = await optionsRes.json();
      const assertionResp = await startAuthentication(options);

      const verifyRes = await fetch('/api/webauthn/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, response: assertionResp }),
      });

      if (!verifyRes.ok) throw new Error('Failed to verify authentication');

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

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100 via-white to-white dark:from-gray-900 dark:via-black dark:to-black" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/30 to-purple-100/30 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full blur-3xl" />
      </div>

      {/* Back button */}
      <Link
        href="/"
        className="absolute top-8 left-8 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </Link>

      <div className="w-full max-w-sm animate-slideUp">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mode === 'signin' 
                ? 'Sign in with your passkey' 
                : 'Register a passkey for secure access'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all placeholder:text-gray-400"
                disabled={loading || success}
                autoFocus
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-lg animate-slideUp">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900 rounded-lg animate-slideUp">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Success! Redirecting...
                </p>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={mode === 'signin' ? handleSignIn : handleRegister}
              disabled={loading || !email || success}
              className="relative w-full py-3.5 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:scale-[1.02] disabled:scale-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="loading-dot"></span>
                  <span className="loading-dot ml-1"></span>
                  <span className="loading-dot ml-1"></span>
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  {mode === 'signin' ? 'Sign in' : 'Create passkey'}
                </span>
              )}
            </button>

            {/* Mode switch */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-black px-2 text-gray-400">Or</span>
              </div>
            </div>

            <button
              onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}
              className="w-full py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              disabled={loading || success}
            >
              {mode === 'signin' 
                ? "Don't have an account? Register" 
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-12 flex items-center justify-center space-x-2 text-xs text-gray-400 dark:text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>End-to-end encrypted • WebAuthn 2.0</span>
        </div>
      </div>
    </main>
  );
}
