import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../shared/DashboardLayout';
import { LayoutDashboardIcon, UserIcon, BellIcon, FileTextIcon, ShieldIcon } from '../Icons';
import StaffDashboardHomePage from './DashboardHomePage';
import StudentsListingPage from '../admin/Pages/StudentsListingPage';
import ComplaintsListingPage from '../admin/Pages/ComplaintsListingPage';
import FeesListingPage from '../admin/Pages/FeesListingPage';
import NotificationsListingPage from '../admin/Pages/NotificationsListingPage';
import ChangePasswordPage from '../applicant/Pages/ChangePasswordPage';

const StaffDashboard = ({ setView }) => {
    const { logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('home');

    const navItems = [
        { id: 'home', label: 'Dashboard', icon: <LayoutDashboardIcon /> },
        { id: 'students', label: 'Students', icon: <UserIcon size={20} /> },
        { id: 'complaints', label: 'Complaints', icon: <BellIcon size={20} /> },
        { id: 'fees', label: 'Fees', icon: <FileTextIcon /> },
        { id: 'notifications', label: 'Notifications', icon: <BellIcon size={20} /> },
        { id: 'change-password', label: 'Change Password', icon: <ShieldIcon /> },
    ];

    const renderPage = () => {
        switch (currentPage) {
            case 'home': return <StaffDashboardHomePage onNavigate={setCurrentPage} />;
            case 'students': return <StudentsListingPage />;
            case 'complaints': return <ComplaintsListingPage />;
            case 'fees': return <FeesListingPage />;
            case 'notifications': return <NotificationsListingPage />;
            case 'change-password': return <ChangePasswordPage />;
            default: return <StaffDashboardHomePage onNavigate={setCurrentPage} />;
        }
    };

    return (
        <DashboardLayout roleLabel="Staff" navItems={navItems} currentPage={currentPage} onNavigate={setCurrentPage} onLogout={(e) => { e.preventDefault(); logout(); setView('landing'); }}>
            {renderPage()}
        </DashboardLayout>
    );
};

export default StaffDashboard;
