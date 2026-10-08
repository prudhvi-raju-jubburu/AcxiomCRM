import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 404 Not Found Page
 */
const NotFoundPage = () => {
  return (
    <div className="text-center py-5">
      <h1 className="display-1 fw-bold text-muted">404</h1>
      <h2 className="mb-3">Page Not Found</h2>
      <p className="text-muted mb-4">
        The requested page does not exist or has not been implemented yet.
      </p>
      <Link to="/" className="btn btn-primary">
        Return to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
