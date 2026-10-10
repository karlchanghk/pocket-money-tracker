import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Week start (Monday)
  const weekStart = new Date(now);
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  // Month start
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  // Year start
  const yearStart = `${now.getFullYear()}-01-01`;

  const db = await getDb();

  const totals = {
    today: sum(db, user.id, todayStr, todayStr),
    week: sum(db, user.id, weekStartStr, todayStr),
    month: sum(db, user.id, monthStart, todayStr),
    year: sum(db, user.id, yearStart, todayStr),
  };

  // By category (this month)
  const catResult = db.exec(`
    SELECT c.id, c.name, c.icon, SUM(r.amount) as total
    FROM records r
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.user_id = ? AND r.date >= ?
    GROUP BY r.category_id, c.name, c.icon
    ORDER BY total DESC
  `, [user.id, monthStart]);

  const byCategory = catResult[0]?.values.map(row => ({
    id: row[0], name: row[1], icon: row[2], total: row[3]
  })) || [];

  // Daily trend (last 30 days)
  const trendResult = db.exec(`
    SELECT r.date, SUM(r.amount) as total
    FROM records r
    WHERE r.user_id = ? AND r.date >= date('now', '-30 days')
    GROUP BY r.date
    ORDER BY r.date
  `, [user.id]);

  const dailyTrend = trendResult[0]?.values.map(row => ({
    date: row[0], total: row[1]
  })) || [];

  // Weekly breakdown (this year, per week)
  const weeklyResult = db.exec(`
    SELECT 
      strftime('%Y-W%W', r.date) as week,
      SUM(r.amount) as total
    FROM records r
    WHERE r.user_id = ? AND r.date >= ?
    GROUP BY week
    ORDER BY week
  `, [user.id, yearStart]);

  const weekly = weeklyResult[0]?.values.map(row => ({
    week: row[0], total: row[1]
  })) || [];

  // Monthly breakdown (this year)
  const monthlyResult = db.exec(`
    SELECT 
      strftime('%Y-%m', r.date) as month,
      SUM(r.amount) as total
    FROM records r
    WHERE r.user_id = ? AND r.date >= ?
    GROUP BY month
    ORDER BY month
  `, [user.id, yearStart]);

  const monthly = monthlyResult[0]?.values.map(row => ({
    month: row[0], total: row[1]
  })) || [];

  // Top records this month
  const topResult = db.exec(`
    SELECT r.*, c.name as category_name, c.icon as category_icon
    FROM records r
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.user_id = ? AND r.date >= ?
    ORDER BY r.amount DESC
    LIMIT 5
  `, [user.id, monthStart]);

  const topColumns = topResult[0]?.columns || [];
  const topRecords = topResult[0]?.values.map(row => {
    const obj: any = {};
    topColumns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  }) || [];

  // Count
  const countResult = db.exec(
    'SELECT COUNT(*) FROM records WHERE user_id = ?',
    [user.id]
  );
  const totalRecords = countResult[0]?.values[0]?.[0] || 0;

  return NextResponse.json({
    totals, byCategory, dailyTrend, weekly, monthly, topRecords, totalRecords
  });
}

function sum(db: any, userId: number, from: string, to: string): number {
  const r = db.exec(
    'SELECT COALESCE(SUM(amount), 0) FROM records WHERE user_id = ? AND date >= ? AND date <= ?',
    [userId, from, to]
  );
  return r[0]?.values[0]?.[0] || 0;
}
