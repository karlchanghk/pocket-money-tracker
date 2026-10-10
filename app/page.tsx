import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';

export default function Home() {
  const user = getAuthUser();
  if (user) redirect('/dashboard');
  redirect('/login');
}
