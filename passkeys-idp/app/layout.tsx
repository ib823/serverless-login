import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Passkeys IdP',
  description: 'Secure authentication with passkeys',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white dark:bg-black">
        {children}
      </body>
    </html>
  );
}
