import React from "react";
import { NavLink } from "react-router-dom";

function SiteFooter({ navLinks = [] }) {
  const footerNavigation = navLinks.filter((link) => link.to !== "/");
  const legalLinks = [
    { to: "/terms", label: "Terms of Service" },
    { to: "/privacy", label: "Privacy Policy" },
  ];
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-label="TaskFlow global footer">
      <div className="site-footer__inner">
        <div className="site-footer__content">
          <div className="site-footer__brand">
            <span className="site-footer__title">TaskFlow</span>
            <p className="site-footer__tagline">
              Plan smarter. Prioritize better. Execute on time. Track your progress with TaskFlow.
            </p>
          </div>
          <nav className="site-footer__column" aria-label="Workspace navigation">
            <p className="site-footer__label">Workspace</p>
            <ul className="site-footer__links">
              {footerNavigation.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className="site-footer__link">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="site-footer__column" aria-label="Legal">
            <p className="site-footer__label">Legal</p>
            <ul className="site-footer__links">
              {legalLinks.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className="site-footer__link">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <div className="site-footer__baseline">
        <div className="site-footer__baseline-inner">
          <div className="site-footer__baseline-column">
            <span>© {currentYear} TaskFlow</span>
            <span>Product released 2026.01</span>
          </div>
          <div className="site-footer__baseline-column">
            <span>All rights reserved | TaskFlow Developer</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
