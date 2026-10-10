'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Category { id: number; name: string; icon: string; }

const ICONS = ['🍜', '🚌', '🛍️', '🎮', '🏠', '📦', '☕', '🍔', '🎬', '📚', '💊', '🎁', '💼', '🏋️', '🌐'];

export default function AddPage() {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('💰');
  const [showNewCat, setShowNewCat] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function loadCats() {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data.categories || []);
    if (data.categories?.length && !categoryId) {
      setCategoryId(data.categories[0].id);
    }
  }

  useEffect(() => { loadCats(); }, []);

  async function handleAddCat() {
    if (!newCatName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), icon: newCatIcon }),
      });
      if (!res.ok) throw new Error('添加失败');
      const data = await res.json();
      setCategories(prev => [...prev, { id: data.id, name: newCatName.trim(), icon: newCatIcon }]);
      setCategoryId(String(data.id));
      setNewCatName('');
      setNewCatIcon('💰');
      setShowNewCat(false);
    } catch {
      setError('添加类别失败');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!amount || parseFloat(amount) <= 0) {
      setError('请输入有效金额');
      return;
    }
    if (!content.trim()) {
      setError('消费内容必填');
      return;
    }

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          amount: parseFloat(amount),
          content: content.trim(),
          categoryId: categoryId ? parseInt(categoryId, 10) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存失败');
      }
      setSuccess(true);
      setAmount('');
      setContent('');
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">记一笔</h1>
        <p className="text-sm text-slate-500">快速记录你的消费</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 max-w-lg">
        {success && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            ✅ 已保存！可以继续添加或 <button type="button" onClick={() => router.push('/dashboard/records')} className="underline">查看记录</button>
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">金额 (¥)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input text-lg font-semibold"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">消费内容</label>
          <input
            type="text"
            className="input"
            placeholder="比如：午餐、地铁、电影票"
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">类别</label>
            <button
              type="button"
              onClick={() => setShowNewCat(v => !v)}
              className="text-xs text-indigo-600 hover:underline"
            >
              {showNewCat ? '取消' : '+ 新建类别'}
            </button>
          </div>

          {showNewCat && (
            <div className="mb-3 p-3 rounded-lg bg-slate-50 space-y-2">
              <div className="flex gap-2">
                <select className="input w-20" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)}>
                  {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                <input
                  className="input flex-1"
                  placeholder="类别名"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                />
                <button type="button" onClick={handleAddCat} className="btn btn-primary">添加</button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(String(c.id))}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  categoryId === String(c.id)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-full">保存</button>
      </form>
    </div>
  );
}
