import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
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
    const existing = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
    }

    const hash = hashPassword(password);
    const userId = await db.exec(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, hash]
    );

    // Initialize default categories
    const defaults = [
      ['餐饮', '🍜'], ['交通', '🚌'], ['购物', '🛍️'],
      ['娱乐', '🎮'], ['居家', '🏠'], ['其他', '📦'],
    ];
    for (const [name, icon] of defaults) {
      await db.exec('INSERT INTO categories (user_id, name, icon) VALUES (?, ?, ?)', [userId, name, icon]);
    }

    const token = signToken(userId, username);
    const res = NextResponse.json({ success: true, username });
    res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
    return res;
  }

  // login
  const users = await db.query<{ id: number; password_hash: string }>(
    'SELECT id, password_hash FROM users WHERE username = ?',
    [username]
  );
  if (users.rows.length === 0) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }
  const user = users.rows[0];
  if (!verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const token = signToken(user.id, username);
  const res = NextResponse.json({ success: true, username });
  res.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
  return res;
}
