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

  const getSum = async (from: string, to: string) => {
    const { rows } = await db.query<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM records WHERE user_id = ? AND date >= ? AND date <= ?',
      [user.id, from, to]
    );
    const v = rows[0]?.total;
    return typeof v === 'string' ? parseFloat(v) : Number(v || 0);
  };

  const totals = {
    today: await getSum(todayStr, todayStr),
    week: await getSum(weekStartStr, todayStr),
    month: await getSum(monthStart, todayStr),
    year: await getSum(yearStart, todayStr),
  };

  const { rows: records } = await db.query(
    `SELECT r.*, c.name as category_name, c.icon as category_icon
     FROM records r LEFT JOIN categories c ON r.category_id = c.id
     WHERE r.user_id = ? ORDER BY r.date DESC, r.id DESC LIMIT 10`,
    [user.id]
  );

  const { rows: byCategory } = await db.query(
    `SELECT COALESCE(c.name, '未分类') as name, c.icon as icon, SUM(r.amount) as total
     FROM records r LEFT JOIN categories c ON r.category_id = c.id
     WHERE r.user_id = ? AND r.date >= ?
     GROUP BY r.category_id
     ORDER BY total DESC`,
    [user.id, monthStart]
  );

  const cats = byCategory.map((c: any) => ({
    name: c.name,
    icon: c.icon,
    total: typeof c.total === 'string' ? parseFloat(c.total) : Number(c.total),
  }));

  return <OverviewClient totals={totals} records={records} byCategory={cats} />;
}
