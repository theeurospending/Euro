// Paginate around Supabase's PostgREST max_rows=1000 cap.
// Caller passes a builder factory — invoked once per page so each call gets a fresh query.
//
// Usage:
//   const rows = await fetchAll<Point>((from, to) =>
//     admin.from('economic_data_points')
//       .select('country_iso, metric_key, period_start, value')
//       .eq('metric_key', 'ecb_main_refi_rate')
//       .order('period_start', { ascending: true })
//       .range(from, to)
//   );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageBuilder<T> = (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any | null }>;

export async function fetchAll<T>(build: PageBuilder<T>, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await build(offset, offset + pageSize - 1);
    if (error) throw new Error(`paginate: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}
