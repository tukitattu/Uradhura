import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GameZone Platform',
  description: 'Premium online gaming platform with 6 exciting games',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-game-bg text-white antialiased">{children}</body>
    </html>
  );
}
