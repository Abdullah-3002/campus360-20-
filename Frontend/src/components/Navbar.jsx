// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ setView, currentView }) => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`landing-nav${isScrolled ? ' scrolled' : ''}`}>
            <div className="container nav-container">
                <div className="logo" onClick={() => setView('landing')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="../logo.png/logo.webp" alt="University of Sialkot Logo" style={{ height: '50px' }} />
                    <span className={`logo-text ${currentView === 'history' ? 'gold' : ''}`}>University of <span className="accent-text">Sialkot</span></span>
                </div>
                <ul className="nav-links">
                    <li><a href="#top" onClick={() => setView('landing')}>Home</a></li>
                    <li className="dropdown">
                        <a href="#about" onClick={(e) => e.preventDefault()}>About <span className="arrow">▼</span></a>
                        <ul className="dropdown-menu">
                            <li><a href="#" onClick={(e) => { e.preventDefault(); setView('history'); }}>History</a></li>
                        </ul>
                    </li>
                    <li className="dropdown">
                        <a href="#admission" onClick={(e) => e.preventDefault()}>Admission <span className="arrow">▼</span></a>
                        <ul className="dropdown-menu">
                            <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Undergraduate Programs coming soon!"); }}>Undergraduate Programs</a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Postgraduate Programs coming soon!"); }}>Postgraduate Programs</a></li>
                        </ul>
                    </li>
                    <li><a href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById('footer').scrollIntoView(); }}>Contact</a></li>
                </ul>
                <div className="auth-buttons">
                    <ThemeToggle showLabel />
                    <button className="btn btn-apply" onClick={() => setView('login')}>Apply Now</button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;