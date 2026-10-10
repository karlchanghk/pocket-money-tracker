import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = parseInt(searchParams.get('limit') || '200', 10);

  const db = await getDb();

  let sql = `
    SELECT r.*, c.name as category_name, c.icon as category_icon
    FROM records r
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.user_id = ?
  `;
  const params: any[] = [user.id];

  if (categoryId) {
    sql += ' AND r.category_id = ?';
    params.push(categoryId);
  }
  if (from) {
    sql += ' AND r.date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND r.date <= ?';
    params.push(to);
  }

  sql += ' ORDER BY r.date DESC, r.id DESC LIMIT ?';
  params.push(limit);

  const { rows: records } = await db.query(sql, params);
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { date, amount, content, categoryId } = body;

  if (!date || !amount || !content) {
    return NextResponse.json({ error: '日期、金额、内容必填' }, { status: 400 });
  }

  const db = await getDb();
  const id = await db.exec(
    'INSERT INTO records (user_id, date, amount, content, category_id) VALUES (?, ?, ?, ?, ?)',
    [user.id, date, parseFloat(amount), content, categoryId || null]
  );

  return NextResponse.json({ success: true, id });
}
