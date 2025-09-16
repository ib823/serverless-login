'use client';

import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function Login() {
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      window.location.href = '/';
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

      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">
            {mode === 'signin' ? 'Sign In' : 'Register'}
          </h2>
        </div>
        
        <div className="space-y-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700"
            disabled={loading}
          />
          
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={mode === 'signin' ? handleSignIn : handleRegister}
            disabled={loading || !email}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In with Passkey' : 'Register Passkey'}
          </button>
          
          <button
            onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}
            className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            disabled={loading}
          >
            {mode === 'signin' ? 'Need to register?' : 'Already have an account?'}
          </button>
        </div>
      </div>
    </main>
  );
}
