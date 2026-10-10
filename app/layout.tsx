import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '零花钱管家',
  description: '记录每天每一笔消费，轻松掌握零花钱去向',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
