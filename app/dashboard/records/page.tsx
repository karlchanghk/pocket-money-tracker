'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Record {
  id: number;
  date: string;
  amount: number;
  content: string;
  category_name?: string;
  category_icon?: string;
}

interface Category { id: number; name: string; icon: string; }

function fmt(n: number) { return `¥${n.toFixed(2)}`; }

export default function RecordsPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCat, setFilterCat] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    const params = new URLSearchParams();
    if (filterCat) params.set('categoryId', filterCat);
    const [year, month] = filterMonth.split('-');
    const from = `${year}-${month}-01`;
    const to = new Date(+year, +month, 0).toISOString().slice(0, 10);
    params.set('from', from);
    params.set('to', to);

    setLoading(true);
    const [recRes, catRes] = await Promise.all([
      fetch(`/api/records?${params}`).then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]);
    setRecords(recRes.records || []);
    setCategories(catRes.categories || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    if (!confirm('确定删除这条记录？')) return;
    await fetch(`/api/records/${id}`, { method: 'DELETE' });
    setRecords(prev => prev.filter(r => r.id !== id));
  }

  const total = records.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">消费记录</h1>
          <p className="text-sm text-slate-500">查看和管理你的所有消费</p>
        </div>
        <Link href="/dashboard/add" className="btn btn-primary">➕ 记一笔</Link>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">月份</label>
          <input
            type="month"
            value={filterMonth}
            onChange={e => { setFilterMonth(e.target.value); }}
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">类别</label>
          <select
            className="input w-40"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">全部类别</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <button onClick={load} className="btn btn-primary">筛选</button>
        <button
          onClick={() => { setFilterCat(''); load(); }}
          className="btn btn-secondary"
        >
          重置
        </button>
        <div className="ml-auto text-sm text-slate-500">
          共 <span className="font-bold text-slate-900">{records.length}</span> 条，
          合计 <span className="font-bold text-red-500">{fmt(total)}</span>
        </div>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">加载中...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            没有找到记录
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                <span className="text-2xl">{r.category_icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.content}</div>
                  <div className="text-xs text-slate-400">{r.date} · {r.category_name || '未分类'}</div>
                </div>
                <div className="font-semibold text-red-500">{fmt(r.amount)}</div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-slate-400 hover:text-red-500 text-xs p-1"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
