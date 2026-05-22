// Fetch Archivo Narrow at runtime from Google Fonts. Cached at the edge.

const ARCHIVO_NARROW_URL = 'https://fonts.gstatic.com/s/archivonarrow/v35/tss5ApVBdCYD5Q7hcxTE1ArZ0Zz8oY2KRmwvKhhvy1aKpA.ttf';

let cached: ArrayBuffer | null = null;

export async function loadArchivoNarrow(): Promise<ArrayBuffer | null> {
  if (cached) return cached;
  try {
    // Module-level memo gives us request-lifetime caching inside the Worker;
    // the Worker cache will also pick this up by URL automatically.
    const res = await fetch(ARCHIVO_NARROW_URL);
    if (!res.ok) return null;
    cached = await res.arrayBuffer();
    return cached;
  } catch {
    return null;
  }
}
