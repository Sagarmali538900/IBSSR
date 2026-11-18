'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import Icon from './Icon';

const links = [
  { href: '/admin/dashboard', label: 'Overview', icon: 'overview' },
  { href: '/admin/exams', label: 'Assessments', icon: 'assessments' },
  { href: '/admin/assignments', label: 'Assignments', icon: 'assignments' },
  { href: '/admin/results', label: 'Results', icon: 'results' },
];

export default function Navbar({ username, isSuperuser, isCollapsed, isMobileOpen, onToggleCollapsed, onCloseMobile }) {
  const pathname = usePathname();
  const items = [
    ...links,
    ...(isSuperuser ? [
      { href: '/admin/franchises', label: 'Partners', icon: 'partners' },
      { href: '/admin/storage', label: 'Storage', icon: 'storage' },
    ] : []),
    { href: '/admin/email-logs', label: 'Email activity', icon: 'email' },
  ];

  return (
    <aside className={`admin-sidebar${isCollapsed ? ' is-collapsed' : ''}${isMobileOpen ? ' is-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand-row">
        <Link href="/admin/dashboard" className="sidebar-brand" onClick={onCloseMobile} aria-label="IBSSR overview">
          <img src="/ibssr-logo.png" alt="" />
          <span className="sidebar-brand-copy"><strong>IBSSR</strong><small>Assessment suite</small></span>
        </Link>
        <button className="sidebar-collapse-button" type="button" onClick={onToggleCollapsed} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name="collapse" size={18} />
        </button>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Administration">
        {items.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(`${href}/`));
          return (
            <Link key={href} href={href} onClick={onCloseMobile} className={`sidebar-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} aria-label={isCollapsed ? label : undefined} title={isCollapsed ? label : undefined}>
              <span className="sidebar-link-icon"><Icon name={icon} size={19} /></span>
              <span className="sidebar-link-label">{label}</span>
              {active && <span className="sidebar-active-dot" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-account">
          <span className="account-avatar">{(username || 'A').slice(0, 1).toUpperCase()}</span>
          <span className="account-details"><strong>{username}</strong><small>{isSuperuser ? 'Administrator' : 'Partner account'}</small></span>
        </div>
        <div className="sidebar-controls">
          <ThemeToggle />
          <a href="/api/auth/logout" className="sidebar-logout"><Icon name="logout" size={17} /><span>Sign out</span></a>
        </div>
      </div>
    </aside>
  );
}
