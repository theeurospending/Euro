// Admin pages keep their original light/paper background so existing
// zinc-coloured controls render with proper contrast. Public pages remain
// on the navy brand bg via globals.css. This local layout shadows it.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--brand-paper)] text-[var(--brand-navy)]">
      {children}
    </div>
  );
}
