import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

/**
 * Basic application layout wrapper containing Navbar, main container, and Footer.
 */
const Layout = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="container py-4 flex-grow-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
