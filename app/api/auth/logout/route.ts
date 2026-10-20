import { NextResponse } from 'next/server';
import { getSessionSupabase } from '@/lib/supabase-session';

export async function POST() {
  const supabase = await getSessionSupabase();
  // 'local' ends this browser's session only and clears its cookies.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) console.error('logout failed', error);
  return NextResponse.json({ ok: true });
}
