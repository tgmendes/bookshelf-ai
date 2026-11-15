'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useState, useEffect } from 'react';

const links = [
  { href: '/library', label: 'Shelf' },
  { href: '/library#next', label: 'Up next' },
  { href: '/stats', label: 'Reading year' },
  { href: '/settings', label: 'Connections' },
];

export function Nav({ isAdmin, updatedLabel, updatedAt }: { isAdmin?: boolean; updatedLabel?: string; updatedAt?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hash, setHash] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const sync = () => { setHash(window.location.hash); setMenuOpen(false); };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [pathname]);

  if (pathname === '/login') return null;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const result = await fetch('/api/auth/logout', { method: 'POST' });
      if (!result.ok) throw new Error('Sign out failed');
      router.push('/login');
      router.refresh();
    } catch { setLoggingOut(false); }
  }

  function active(href: string) {
    if (href === '/library#next') return pathname === '/library' && hash === '#next';
    if (href === '/library') return pathname.startsWith('/library') && hash !== '#next';
    return pathname.startsWith(href);
  }

  const navigation = (mobile = false) => (
    <nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'} className={mobile ? 'flex flex-col gap-1' : 'hidden lg:flex items-center gap-1'}>
      {[...links, ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : [])].map(({ href, label }) => (
        <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className="nav-link"
          onClick={() => { setHash(href.includes('#') ? '#next' : ''); setMenuOpen(false); }}>{label}</Link>
      ))}
    </nav>
  );

  return (
    <header className="room-wrap">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4 border-b border-border py-7">
        <Link href="/library" aria-label="OpenShelf home" className="inline-flex min-h-11 items-center font-display text-[26px] font-light uppercase tracking-[.18em]">
          Open<span className="font-semibold text-accent">Shelf</span>
        </Link>
        {navigation()}
        <div className="flex items-center gap-2.5">
          {updatedAt && updatedLabel && (
            <div className="hidden xl:flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-2 text-[13px] text-accent-on-soft">
              <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
              <time dateTime={updatedAt} title={updatedAt}>Updated · {updatedLabel}</time>
            </div>
          )}
          <ThemeToggle />
          <button onClick={handleLogout} disabled={loggingOut} className="icon-button hidden lg:grid disabled:opacity-50" aria-label="Sign out" title="Sign out"><LogOut className="size-[18px]" aria-hidden="true" /></button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="icon-button lg:hidden" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-menu">
            {menuOpen ? <X className="size-[18px]" aria-hidden="true" /> : <Menu className="size-[18px]" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div id="mobile-menu" className="lg:hidden border-b border-border py-4">
          {navigation(true)}
          {updatedLabel && <p className="px-4 py-2 text-sm text-accent-on-soft">Updated · {updatedLabel}</p>}
          <button onClick={handleLogout} disabled={loggingOut} className="nav-link w-full disabled:opacity-50">Sign out</button>
        </div>
      )}
    </header>
  );
}
