import './globals.css';

export const metadata = {
  title: 'Mock Interview System',
  description: 'Voice-first technical mock interview platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
