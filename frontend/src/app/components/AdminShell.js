'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Icon from './Icon';

const pageNames = [
  ['/admin/dashboard', 'Overview'],
  ['/admin/exams', 'Assessments'],
  ['/admin/assignments', 'Assignments'],
  ['/admin/results', 'Results'],
  ['/admin/franchises', 'Partners'],
  ['/admin/storage', 'Storage'],
  ['/admin/email-logs', 'Email activity'],
];

export default function AdminShell({ children, username, isSuperuser }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pageName = pageNames.find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[1] || 'Administration';

  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMobileOpen]);

  return (
    <div className={`admin-shell${isCollapsed ? ' is-sidebar-collapsed' : ''}`}>
      <Navbar
        username={username}
        isSuperuser={isSuperuser}
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onToggleCollapsed={() => setIsCollapsed((collapsed) => !collapsed)}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      {isMobileOpen && <button className="mobile-sidebar-scrim" onClick={() => setIsMobileOpen(false)} aria-label="Close navigation" />}

      <div className="admin-main-column">
        <header className="admin-topbar">
          <button className="topbar-menu-button" type="button" onClick={() => setIsMobileOpen(true)} aria-label="Open navigation" aria-expanded={isMobileOpen}>
            <Icon name="menu" size={19} />
          </button>
          <div className="topbar-heading">
            <strong>{pageName}</strong>
          </div>
          <div className="topbar-status"><span className="topbar-secure"><span /> Secure workspace</span></div>
        </header>
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
