'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ username, isSuperuser }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="navbar" style={{ position: 'relative' }}>
      <Link href="/admin/dashboard" className="nav-brand" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <img 
          src="/ibssr-logo.png" 
          alt="IBSSR Logo" 
          style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '50%' }}
        />
        <span>IBSSR Portal</span>
      </Link>

      {/* Hamburger Toggle Button for Mobile */}
      <button 
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
        style={{
          display: 'none', // Managed by media query in CSS
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          padding: '0.5rem',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110
        }}
        className="nav-hamburger"
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {isOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Navigation Links list */}
      <ul className={`nav-links ${isOpen ? 'open' : ''}`}>
        <li>
          <Link href="/admin/dashboard" className="nav-link" onClick={closeMenu}>
            Dashboard
          </Link>
        </li>
        <li>
          <Link href="/admin/exams" className="nav-link" onClick={closeMenu}>
            Exams
          </Link>
        </li>
        <li>
          <Link href="/admin/assignments" className="nav-link" onClick={closeMenu}>
            Assignments
          </Link>
        </li>
        <li>
          <Link href="/admin/results" className="nav-link" onClick={closeMenu}>
            Results
          </Link>
        </li>
        {isSuperuser && (
          <li>
            <Link href="/admin/franchises" className="nav-link" onClick={closeMenu}>
              Franchises
            </Link>
          </li>
        )}
        <li>
          <Link href="/admin/email-logs" className="nav-link" onClick={closeMenu}>
            Email Logs
          </Link>
        </li>
        
        {/* Grouped Actions (User badge, ThemeToggle, Logout Button) */}
        <li className="nav-actions-group">
          <span className="nav-user-badge">
            User: <strong>{username}</strong>
          </span>
          <div className="nav-btn-row">
            <ThemeToggle />
            <a href="/api/auth/logout" className="btn btn-secondary nav-logout-btn">
              Logout
            </a>
          </div>
        </li>
      </ul>
    </nav>
  );
}
