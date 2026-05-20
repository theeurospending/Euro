import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type SeoOverride = {
  path: string;
  title: string | null;
  description: string | null;
  og_image_url: string | null;
};

export async function getSeoOverride(path: string): Promise<SeoOverride | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from('seo_overrides')
      .select('path, title, description, og_image_url')
      .eq('path', path)
      .maybeSingle();
    return (data as SeoOverride | null) ?? null;
  } catch {
    return null;
  }
}
