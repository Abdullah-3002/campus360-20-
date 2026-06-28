// src/App.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import ApplicantDashboard from './dashboard/applicant/Dashboard';
import AdminDashboard from './dashboard/admin/Dashboard';
import StudentDashboard from './dashboard/student/Dashboard';
import TeacherDashboard from './dashboard/teacher/Dashboard';
import StaffDashboard from './dashboard/staff/Dashboard';
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

const getDashboardForRole = (userType) => {
    switch (userType) {
        case 'admin': return AdminDashboard;
        case 'student': return StudentDashboard;
        case 'teacher': return TeacherDashboard;
        case 'staff': return StaffDashboard;
        case 'applicant':
        default: return ApplicantDashboard;
    }
};

const App = () => {
    const [view, setView] = useState('landing');
    const { user } = useAuth();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [view]);

    if (view === 'dashboard' && user) {
        const DashboardComponent = getDashboardForRole(user.user_type);
        return <DashboardComponent setView={setView} user={user} />;
    }
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
