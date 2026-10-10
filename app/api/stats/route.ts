import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function norm(v: any): number {
  if (v == null) return 0;
  return typeof v === 'string' ? parseFloat(v) : Number(v);
}

export async function GET(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const isPG = db.dialect === 'postgres';

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const weekStart = new Date(now);
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const yearStart = `${now.getFullYear()}-01-01`;

  const getSum = async (from: string, to: string) => {
    const { rows } = await db.query<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM records WHERE user_id = ? AND date >= ? AND date <= ?',
      [user.id, from, to]
    );
    return norm(rows[0]?.total);
  };

  const totals = {
    today: await getSum(todayStr, todayStr),
    week: await getSum(weekStartStr, todayStr),
    month: await getSum(monthStart, todayStr),
    year: await getSum(yearStart, todayStr),
  };

  const { rows: byCategory } = await db.query(
    `SELECT COALESCE(c.id, 0) as id, COALESCE(c.name, '未分类') as name, c.icon as icon, SUM(r.amount) as total
     FROM records r LEFT JOIN categories c ON r.category_id = c.id
     WHERE r.user_id = ? AND r.date >= ?
     GROUP BY r.category_id, c.name, c.icon, c.id
     ORDER BY total DESC`,
    [user.id, monthStart]
  );

  // Daily trend (last 30 days)
  const dailySql = isPG
    ? `SELECT r.date::text as date, SUM(r.amount) as total FROM records r
       WHERE r.user_id = ? AND r.date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY r.date ORDER BY r.date`
    : `SELECT r.date, SUM(r.amount) as total FROM records r
       WHERE r.user_id = ? AND r.date >= date('now', '-30 days')
       GROUP BY r.date ORDER BY r.date`;
  const { rows: dailyTrend } = await db.query(dailySql, [user.id]);

  // Weekly breakdown
  const weeklySql = isPG
    ? `SELECT to_char(r.date, 'IYYY-"W"IW') as week, SUM(r.amount) as total
       FROM records r WHERE r.user_id = ? AND r.date >= ?
       GROUP BY week ORDER BY week`
    : `SELECT strftime('%Y-W%W', r.date) as week, SUM(r.amount) as total
       FROM records r WHERE r.user_id = ? AND r.date >= ?
       GROUP BY week ORDER BY week`;
  const { rows: weekly } = await db.query(weeklySql, [user.id, yearStart]);

  // Monthly breakdown
  const monthlySql = isPG
    ? `SELECT to_char(r.date, 'YYYY-MM') as month, SUM(r.amount) as total
       FROM records r WHERE r.user_id = ? AND r.date >= ?
       GROUP BY month ORDER BY month`
    : `SELECT strftime('%Y-%m', r.date) as month, SUM(r.amount) as total
       FROM records r WHERE r.user_id = ? AND r.date >= ?
       GROUP BY month ORDER BY month`;
  const { rows: monthly } = await db.query(monthlySql, [user.id, yearStart]);

  const { rows: topRecords } = await db.query(
    `SELECT r.*, c.name as category_name, c.icon as category_icon
     FROM records r LEFT JOIN categories c ON r.category_id = c.id
     WHERE r.user_id = ? AND r.date >= ?
     ORDER BY r.amount DESC LIMIT 5`,
    [user.id, monthStart]
  );

  const { rows: countRows } = await db.query<{ count: number }>(
    'SELECT COUNT(*) as count FROM records WHERE user_id = ?',
    [user.id]
  );

  return NextResponse.json({
    totals,
    byCategory: byCategory.map((c: any) => ({ ...c, total: norm(c.total) })),
    dailyTrend: dailyTrend.map((d: any) => ({ ...d, total: norm(d.total) })),
    weekly: weekly.map((w: any) => ({ ...w, total: norm(w.total) })),
    monthly: monthly.map((m: any) => ({ ...m, total: norm(m.total) })),
    topRecords,
    totalRecords: norm(countRows[0]?.count),
  });
}
