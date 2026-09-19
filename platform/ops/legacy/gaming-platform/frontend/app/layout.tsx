import type { Metadata } from 'next';
import './globals.css';
import DesignTokenProvider from '@/components/DesignTokenProvider';

export const metadata: Metadata = {
  title: 'Ura Live',
  description: 'Ura Live social rooms, moments, games, and community',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ background: '#0a0010', color: '#fff', minHeight: '100vh' }}>
        <DesignTokenProvider>
          {children}
        </DesignTokenProvider>
      </body>
    </html>
  );
}
