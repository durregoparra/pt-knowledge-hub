import 'server-only';
import { getSessionSupabase } from '@/lib/supabase-session';

// Records that the signed-in user opened the app today (UTC), for the Return metric.
// Uses the session client, so RLS lets users add only their own row for today; repeat
// calls on the same day hit the primary key and are ignored. (An upsert would need a select
// grant, which users deliberately lack.) A failure is logged and never breaks the page.
export async function recordVisit(userId: string): Promise<void> {
  try {
    const supabase = await getSessionSupabase();
    const { error } = await supabase.from('visits').insert({ user_id: userId });
    if (error && error.code !== '23505') console.error('visit record failed', error);
  } catch (err) {
    console.error('visit record failed', err);
  }
}
