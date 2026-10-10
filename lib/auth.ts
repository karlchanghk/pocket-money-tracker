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
    const decoded = jwt.verify(token, JWT_SECRET) as unknown;
    if (decoded && typeof decoded === 'object' && 'sub' in decoded && 'username' in decoded) {
      return decoded as { sub: number; username: string };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<{ id: number; username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return { id: decoded.sub, username: decoded.username };
}
