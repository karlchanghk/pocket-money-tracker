'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];
function fmt(n: number) { return `¥${(n || 0).toFixed(2)}`; }

interface Stats {
  totals: { today: number; week: number; month: number; year: number };
  byCategory: { name?: string; icon?: string; total: number }[];
  dailyTrend: { date: string; total: number }[];
  weekly: { week: string; total: number }[];
  monthly: { month: string; total: number }[];
  topRecords: any[];
  totalRecords: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [view, setView] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return <div className="text-center py-12 text-slate-400">加载中...</div>;
  }

  const trendData = view === 'week'
    ? stats.dailyTrend.slice(-7)
    : view === 'month'
    ? stats.dailyTrend.slice(-30)
    : stats.monthly.map(m => ({ date: m.month, total: m.total }));

  const pieData = stats.byCategory.map(c => ({
    name: c.name || '未分类', value: c.total, icon: c.icon,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">统计分析</h1>
        <p className="text-sm text-slate-500">多维度了解你的消费习惯</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="今日" value={stats.totals.today} color="bg-orange-50 text-orange-600" />
        <StatCard label="本周" value={stats.totals.week} color="bg-blue-50 text-blue-600" />
        <StatCard label="本月" value={stats.totals.month} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="今年" value={stats.totals.year} color="bg-purple-50 text-purple-600" />
      </div>

      {/* Trend */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">消费趋势</h2>
          <div className="flex gap-1 text-sm">
            {(['week', 'month', 'year'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  view === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {v === 'week' ? '近7天' : v === 'month' ? '近30天' : '今年月度'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `¥${v}`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">暂无数据</div>
          )}
        </div>
      </div>

      {/* Two column */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category pie */}
        <div className="card">
          <h2 className="font-semibold mb-4">本月分类占比</h2>
          {pieData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
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
            <div className="h-72 flex items-center justify-center text-slate-400">暂无数据</div>
          )}

          {/* Category breakdown list */}
          {pieData.length > 0 && (
            <div className="mt-4 space-y-2">
              {pieData.map((c, i) => {
                const total = pieData.reduce((s, x) => s + x.value, 0);
                const pct = ((c.value / total) * 100).toFixed(1);
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span>{c.icon || '📦'}</span>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span>{c.name}</span>
                        <span className="text-slate-500">{fmt(c.value)} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top records */}
        <div className="card">
          <h2 className="font-semibold mb-4">本月 Top 5 消费</h2>
          {stats.topRecords.length > 0 ? (
            <div className="space-y-3">
              {stats.topRecords.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-slate-200 text-slate-700' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>{i + 1}</span>
                  <span className="text-xl">{r.category_icon || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{r.content}</div>
                    <div className="text-xs text-slate-400">{r.date}</div>
                  </div>
                  <div className="font-bold text-red-500">{fmt(r.amount)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">暂无数据</div>
          )}
        </div>
      </div>

      {/* Monthly bar */}
      <div className="card">
        <h2 className="font-semibold mb-4">今年月度消费</h2>
        <div className="h-64">
          {stats.monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `¥${v}`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card">
      <div className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${color} mb-2`}>{label}</div>
      <div className="text-2xl font-bold">{fmt(value)}</div>
    </div>
  );
}
