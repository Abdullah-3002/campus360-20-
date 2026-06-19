// src/App.jsx
import React, { useState, useEffect } from 'react';
import Dashboard from './dashboard/applicant/Dashboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './components/Hero';
import AboutSection from './components/AboutSection';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import LoginPage from './Pages/LoginPage';                    
import SignupPage from './Pages/SignupPage';                  
import ForgotPasswordPage from './Pages/ForgotPasswordPage';  
import HistoryPage from './Pages/HistoryPage';                

const App = () => {
    const [view, setView] = useState('landing');
    const [user, setUser] = useState({ id: 'MJ8012002', name: 'Student Applicant' });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [view]);

    if (view === 'dashboard' && user) return <Dashboard setView={setView} user={user} />;
    if (view === 'login') return <LoginPage setView={setView} />;
    if (view === 'signup') return <SignupPage setView={setView} />;
    if (view === 'forgot-password') return <ForgotPasswordPage setView={setView} />;
    if (view === 'history') return <HistoryPage setView={setView} />;

    return (
        <div id="top">
            <Navbar setView={setView} currentView={view} />
            <Hero />
            <AboutSection />
            <Features />
            <Testimonials />
            <Footer setView={setView} />
        </div>
    );
};

export default App;