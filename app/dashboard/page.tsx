import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import OverviewClient from './OverviewClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = getAuthUser();
  if (!user) return null;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const weekStart = new Date(now);
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(now.getDate() + diffToMonday);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const yearStart = `${now.getFullYear()}-01-01`;

  const db = await getDb();

  const sum = (from: string, to: string) => {
    const r = db.exec(
      'SELECT COALESCE(SUM(amount), 0) FROM records WHERE user_id = ? AND date >= ? AND date <= ?',
      [user.id, from, to]
    );
    return r[0]?.values[0]?.[0] || 0;
  };

  const totals = {
    today: sum(todayStr, todayStr),
    week: sum(weekStartStr, todayStr),
    month: sum(monthStart, todayStr),
    year: sum(yearStart, todayStr),
  };

  // Recent 10 records
  const recResult = db.exec(`
    SELECT r.*, c.name as category_name, c.icon as category_icon
    FROM records r LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.user_id = ? ORDER BY r.date DESC, r.id DESC LIMIT 10
  `, [user.id]);
  const recCols = recResult[0]?.columns || [];
  const records = (recResult[0]?.values || []).map(row => {
    const obj: any = {};
    recCols.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });

  // Category breakdown this month
  const catResult = db.exec(`
    SELECT COALESCE(c.name, '未分类') as name, c.icon as icon, SUM(r.amount) as total
    FROM records r LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.user_id = ? AND r.date >= ?
    GROUP BY r.category_id
    ORDER BY total DESC
  `, [user.id, monthStart]);
  const catRows = catResult[0]?.values || [];
  const byCategory = catRows.map(row => ({ name: row[0], icon: row[1], total: row[2] }));

  return <OverviewClient totals={totals} records={records} byCategory={byCategory} />;
}
