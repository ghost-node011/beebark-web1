import React from 'react';
import { Link } from 'react-router-dom';

const linkClass = (active) => `rounded-full px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-black text-white' : 'text-gray-600 hover:text-black'}`;

/**
 * Slim "Portfolio · CV · Contact" bar on the public portfolio pages.
 * `onContact` scrolls to the contact section when it's on the same page.
 */
const PortfolioNav = ({ username, name, active = 'portfolio', showCv, showContact, onContact }) => {
  if (!showCv && !showContact) return null;
  const base = `/portfolio/${username}`;
  return (
    <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur print:hidden" aria-label="Portfolio pages" data-pdf-ignore>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <span className="min-w-0 truncate text-sm font-semibold text-black">{name}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Link to={base} className={linkClass(active === 'portfolio')} aria-current={active === 'portfolio' ? 'page' : undefined} data-testid="pf-nav-portfolio">Portfolio</Link>
          {showCv && (
            <Link to={`${base}/cv`} className={linkClass(active === 'cv')} aria-current={active === 'cv' ? 'page' : undefined} data-testid="pf-nav-cv">CV</Link>
          )}
          {showContact && (onContact ? (
            <a href="#contact" onClick={(e) => { e.preventDefault(); onContact(); }} className={linkClass(false)} data-testid="pf-nav-contact">Contact</a>
          ) : (
            <Link to={`${base}#contact`} className={linkClass(false)} data-testid="pf-nav-contact">Contact</Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default PortfolioNav;
