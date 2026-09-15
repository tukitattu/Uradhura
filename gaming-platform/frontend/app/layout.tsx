import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DearLive Gaming',
  description: 'Premium live gaming platform — 6 exciting games, live rounds, instant payouts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ background: '#0a0010', color: '#fff', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
