import './globals.css';

export const metadata = {
  title: 'IBSSR Assessment Portal',
  description: 'IBSSR Psychological & Cognitive Assessment Portal — Secure, professional online examination system.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </body>
    </html>
  );
}
