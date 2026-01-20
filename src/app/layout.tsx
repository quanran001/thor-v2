import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SOP Alchemist V2',
  description: 'Chaotic Workflows -> Structured SOPs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0B0F19] text-gray-100" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
