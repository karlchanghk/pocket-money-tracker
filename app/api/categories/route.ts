import { NextRequest, NextResponse } from 'next/server';
import { getDb, persistDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const result = db.exec(
    'SELECT id, name, icon FROM categories WHERE user_id = ? ORDER BY id',
    [user.id]
  );
  const rows = result[0]?.values || [];
  const columns = result[0]?.columns || [];
  const categories = rows.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, icon } = await request.json();
  if (!name) return NextResponse.json({ error: '类别名称必填' }, { status: 400 });

  const db = await getDb();
  db.run(
    'INSERT INTO categories (user_id, name, icon) VALUES (?, ?, ?)',
    [user.id, name, icon || '💰']
  );
  persistDb(db);

  const result = db.exec('SELECT last_insert_rowid() as id');
  return NextResponse.json({ success: true, id: result[0].values[0][0] });
}
