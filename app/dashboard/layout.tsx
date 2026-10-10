import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', label: '总览', icon: '📊' },
  { href: '/dashboard/records', label: '消费记录', icon: '📝' },
  { href: '/dashboard/add', label: '记一笔', icon: '➕' },
  { href: '/dashboard/stats', label: '统计分析', icon: '📈' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = getAuthUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-bold text-lg text-slate-900">零花钱管家</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">你好, {user.username}</span>
            <form action="/api/auth/logout" method="POST">
              <button className="btn btn-secondary text-xs py-1.5">退出</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <nav className="hidden md:flex flex-col w-48 gap-1 shrink-0">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-10">
        <div className="flex justify-around">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center py-2 px-3 text-xs text-slate-600"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      <div className="md:hidden h-16" />
    </div>
  );
}
