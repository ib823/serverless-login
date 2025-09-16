import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-100 via-white to-white dark:from-gray-900 dark:via-black dark:to-black" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-purple-100/20 to-blue-100/20 dark:from-purple-900/10 dark:to-blue-900/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full space-y-12 animate-fadeIn">
        {/* Logo and brand */}
        <div className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 rounded-2xl flex items-center justify-center shadow-2xl">
            <svg className="w-10 h-10 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight">
              Passkeys
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Authentication reimagined
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Link
            href="/login"
            className="group relative w-full flex items-center justify-center py-4 px-6 bg-black dark:bg-white text-white dark:text-black font-medium rounded-xl hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <span>Sign in with Passkey</span>
            <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          
          <p className="text-center text-sm text-gray-500 dark:text-gray-500">
            No passwords. Just you.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Protected by WebAuthn • Zero Knowledge
        </p>
      </footer>
    </main>
  );
}
