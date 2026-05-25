import Link from 'next/link';

export function AdminNav() {
  return (
    <nav className="border-b bg-card px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 sm:gap-4">
      <span className="font-semibold text-sm">🐾 Staff Dashboard</span>
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground py-2 px-1 -my-1">
        Admin Home
      </Link>
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground py-2 px-1 -my-1">
        Customer View
      </Link>
    </nav>
  );
}
