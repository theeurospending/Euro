// Server-side helper that asserts the current request comes from an admin user.
// Use inside route handlers / server actions before calling admin-only logic.

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AdminContext = {
  userId: string;
  email: string;
  isSuperadmin: boolean;
};

export async function requireAdmin(): Promise<{ ok: true; ctx: AdminContext } | { ok: false; reason: string; status: number }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'not signed in', status: 401 };

  const { data: profile } = await supabase
    .from('users')
    .select('email, is_admin, is_superadmin, deleted_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin || profile.deleted_at) {
    return { ok: false, reason: 'not an admin', status: 403 };
  }

  return {
    ok: true,
    ctx: { userId: user.id, email: profile.email, isSuperadmin: !!profile.is_superadmin },
  };
}
