import './globals.css';
import { Inter } from 'next/font/google';
import { AlertProvider } from '@/app/components/AlertProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'IBSSR Assessment Portal',
  description: 'IBSSR Psychological & Cognitive Assessment Portal — Secure, professional online examination system.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AlertProvider>{children}</AlertProvider>
      </body>
    </html>
  );
}
