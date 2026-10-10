import { NextRequest, NextResponse } from 'next/server';
import { getDb, persistDb } from '@/lib/db';
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

  const result = db.exec(sql, params);
  const columns = result[0]?.columns || [];
  const rows = result[0]?.values || [];

  const records = rows.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });

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
  db.run(
    'INSERT INTO records (user_id, date, amount, content, category_id) VALUES (?, ?, ?, ?, ?)',
    [user.id, date, parseFloat(amount), content, categoryId || null]
  );
  persistDb(db);

  const result = db.exec('SELECT last_insert_rowid() as id');
  const newId = result[0].values[0][0];
  return NextResponse.json({ success: true, id: newId });
}
