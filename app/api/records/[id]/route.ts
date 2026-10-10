import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  await db.exec('DELETE FROM records WHERE id = ? AND user_id = ?', [parseInt(id, 10), user.id]);

  return NextResponse.json({ success: true });
}
