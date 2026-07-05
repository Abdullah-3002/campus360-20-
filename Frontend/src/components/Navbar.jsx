// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isHistory = location.pathname === '/history';
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const goHome = () => {
        if (location.pathname === '/') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            navigate('/');
        }
    };

    return (
        <nav className={`landing-nav${isScrolled ? ' scrolled' : ''}`}>
            <div className="container nav-container">
                <div className="logo" onClick={goHome} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="../logo.png/logo.webp" alt="University of Sialkot Logo" style={{ height: '50px' }} />
                    <span className={`logo-text ${isHistory ? 'gold' : ''}`}>University of <span className="accent-text">Sialkot</span></span>
                </div>
                <ul className="nav-links">
                    <li><a href="#top" onClick={(e) => { e.preventDefault(); goHome(); }}>Home</a></li>
                    <li className="dropdown">
                        <a href="#about" onClick={(e) => e.preventDefault()}>About <span className="arrow">▼</span></a>
                        <ul className="dropdown-menu">
                            <li><Link to="/history">History</Link></li>
                        </ul>
                    </li>
                    <li className="dropdown">
                        <a href="#admission" onClick={(e) => e.preventDefault()}>Admission <span className="arrow">▼</span></a>
                        <ul className="dropdown-menu">
                            <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Undergraduate Programs coming soon!"); }}>Undergraduate Programs</a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Postgraduate Programs coming soon!"); }}>Postgraduate Programs</a></li>
                        </ul>
                    </li>
                    <li><a href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById('footer')?.scrollIntoView(); }}>Contact</a></li>
                </ul>
                <div className="auth-buttons">
                    <ThemeToggle showLabel />
                    <button className="btn btn-apply" onClick={() => navigate('/login')}>Apply Now</button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
