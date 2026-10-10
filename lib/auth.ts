import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(userId: number, username: string): string {
  return jwt.sign({ sub: userId, username }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { sub: number; username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: number; username: string };
  } catch {
    return null;
  }
}

export function getAuthUser(): { id: number; username: string } | null {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return { id: decoded.sub, username: decoded.username };
}
