import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const { rows: categories } = await db.query(
    'SELECT id, name, icon FROM categories WHERE user_id = ? ORDER BY id',
    [user.id]
  );
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, icon } = await request.json();
  if (!name) return NextResponse.json({ error: '类别名称必填' }, { status: 400 });

  const db = await getDb();
  const id = await db.exec(
    'INSERT INTO categories (user_id, name, icon) VALUES (?, ?, ?)',
    [user.id, name, icon || '💰']
  );
  return NextResponse.json({ success: true, id });
}
