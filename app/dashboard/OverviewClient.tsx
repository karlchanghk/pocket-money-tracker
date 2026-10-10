'use client';

import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Totals { today: number; week: number; month: number; year: number; }
interface Record { id: number; date: string; amount: number; content: string; category_name?: string; category_icon?: string; }
interface CatSlice { name: string; icon: string; total: number; }

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

function fmt(n: number) { return `¥${n.toFixed(2)}`; }

export default function OverviewClient({
  totals, records, byCategory,
}: { totals: Totals; records: Record[]; byCategory: CatSlice[] }) {

  const pieData = byCategory.map(c => ({ name: c.name, value: c.total, icon: c.icon }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">总览</h1>
        <p className="text-sm text-slate-500">快速查看你的消费情况</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '今日消费', value: totals.today, color: 'bg-orange-50 text-orange-600' },
          { label: '本周消费', value: totals.week, color: 'bg-blue-50 text-blue-600' },
          { label: '本月消费', value: totals.month, color: 'bg-indigo-50 text-indigo-600' },
          { label: '今年消费', value: totals.year, color: 'bg-purple-50 text-purple-600' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${s.color} mb-2`}>{s.label}</div>
            <div className="text-2xl font-bold">{fmt(s.value)}</div>
          </div>
        ))}
      </div>

      {/* Category chart + quick link */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">本月分类占比</h2>
            <Link href="/dashboard/stats" className="text-xs text-indigo-600 hover:underline">更多 →</Link>
          </div>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={90}
                    paddingAngle={2} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent! * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              本月暂无消费记录
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">最近记录</h2>
            <Link href="/dashboard/records" className="text-xs text-indigo-600 hover:underline">全部 →</Link>
          </div>
          <div className="space-y-3">
            {records.length === 0 && (
              <div className="text-slate-400 text-sm text-center py-8">
                还没有任何记录，<Link href="/dashboard/add" className="text-indigo-600 hover:underline">去记一笔</Link>
              </div>
            )}
            {records.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className="text-xl">{r.category_icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{r.content}</div>
                  <div className="text-xs text-slate-400">{r.date} · {r.category_name || '未分类'}</div>
                </div>
                <div className="font-semibold text-red-500">{fmt(r.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
