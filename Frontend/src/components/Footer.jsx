// src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer id="footer" className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-col">
                        <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src="../logo.png/logo.webp" alt="USKT Logo" style={{ height: '60px' }} />
                            <h3 style={{ color: 'white', margin: 0 }}>University of <span className="accent-text">Sialkot</span></h3>
                        </div>
                        <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>
                            University of Sialkot aspires for academic excellence and quality research by developing a culture of creativity and innovation with focus on social and cultural values.
                        </p>
                    </div>
                    <div className="footer-col">
                        <h4>About University</h4>
                        <ul className="footer-links">
                            <li><Link to="/" onClick={() => window.scrollTo(0, 0)}>Home</Link></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Programs coming soon!"); }}>Undergraduate Programs</a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Programs coming soon!"); }}>Postgraduate Programs</a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Structure coming soon!"); }}>Fee Structure</a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Profiles coming soon!"); }}>Faculty Profiles</a></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4>Useful Links</h4>
                        <ul className="footer-links">
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Contact Us</a></li>
                            <li><a href="#">Faculties</a></li>
                            <li><a href="#">Download</a></li>
                            <li><a href="#">Board of Societies</a></li>
                            <li><a href="#">FAQs</a></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4>Contact Us</h4>
                        <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '10px' }}>
                            📍 Sialkot-Daska Road, Sialkot, Punjab, Pakistan
                        </p>
                        <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '10px' }}>
                            📞 +92 52 333 4444
                        </p>
                        <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
                            📧 info@uskt.edu.pk
                        </p>
                        <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                            <a href="#" className="accent-text">Facebook</a>
                            <a href="#" className="accent-text">Twitter</a>
                            <a href="#" className="accent-text">LinkedIn</a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2024 University of Sialkot. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
