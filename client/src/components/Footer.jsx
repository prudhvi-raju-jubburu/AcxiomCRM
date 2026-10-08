import React from 'react';

/**
 * Global application footer
 * Clean, professional, and understated design
 */
const Footer = () => {
  return (
    <footer className="bg-white border-top py-3 mt-auto">
      <div className="container d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
        <div className="text-muted small">
          &copy; {new Date().getFullYear()} <strong>AcxiomCRM</strong> &bull; Customer Relationship Management
        </div>
        <div className="d-flex align-items-center gap-3 small text-muted">
          <span>Role-Based CRM</span>
          <span>&bull;</span>
          <span className="text-success d-inline-flex align-items-center gap-1">
            <span className="status-dot online"></span> System Operational
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
