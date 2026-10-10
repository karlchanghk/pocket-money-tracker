import { NextRequest, NextResponse } from 'next/server';
import { getDb, persistDb } from '@/lib/db';
import { hashPassword, verifyPassword, signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'register';
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
  }
  if (username.length < 2 || password.length < 6) {
    return NextResponse.json({ error: '用户名至少2位，密码至少6位' }, { status: 400 });
  }

  const db = await getDb();

  if (action === 'register') {
    const existing = db.exec('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
    }

    const hash = hashPassword(password);
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    persistDb(db);

    const result = db.exec('SELECT last_insert_rowid() as id');
    const userId = result[0].values[0][0] as number;

    // Initialize default categories for new user
    const defaults = [
      ['餐饮', '🍜'], ['交通', '🚌'], ['购物', '🛍️'],
      ['娱乐', '🎮'], ['居家', '🏠'], ['其他', '📦'],
    ];
    for (const [name, icon] of defaults) {
      db.run('INSERT INTO categories (user_id, name, icon) VALUES (?, ?, ?)', [userId, name, icon]);
    }
    persistDb(db);

    const token = signToken(userId, username);
    const res = NextResponse.json({ success: true, username });
    res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  // login
  const rows = db.exec('SELECT id, password_hash FROM users WHERE username = ?', [username]);
  if (rows.length === 0 || rows[0].values.length === 0) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }
  const [id, hash] = rows[0].values[0] as [number, string];
  if (!verifyPassword(password, hash)) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const token = signToken(id, username);
  const res = NextResponse.json({ success: true, username });
  res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
  return res;
}
