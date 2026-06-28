import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../shared/DashboardLayout';
import { LayoutDashboardIcon, BookIcon, ClipboardIcon, FileTextIcon, BellIcon, ShieldIcon } from '../Icons';
import TeacherDashboardHomePage from './DashboardHomePage';
import { TeacherSectionsPage, TeacherAttendancePage, TeacherExaminationsPage, TeacherNotificationsPage } from './Pages/TeacherModulePages';
import ChangePasswordPage from '../applicant/Pages/ChangePasswordPage';

const TeacherDashboard = ({ setView }) => {
    const { logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('home');

    const navItems = [
        { id: 'home', label: 'Dashboard', icon: <LayoutDashboardIcon /> },
        { id: 'sections', label: 'My Sections', icon: <BookIcon size={20} /> },
        { id: 'attendance', label: 'Attendance', icon: <ClipboardIcon size={20} /> },
        { id: 'examinations', label: 'Examinations', icon: <FileTextIcon /> },
        { id: 'notifications', label: 'Notifications', icon: <BellIcon size={20} /> },
        { id: 'change-password', label: 'Change Password', icon: <ShieldIcon /> },
    ];

    const renderPage = () => {
        switch (currentPage) {
            case 'home': return <TeacherDashboardHomePage onNavigate={setCurrentPage} />;
            case 'sections': return <TeacherSectionsPage />;
            case 'attendance': return <TeacherAttendancePage />;
            case 'examinations': return <TeacherExaminationsPage />;
            case 'notifications': return <TeacherNotificationsPage />;
            case 'change-password': return <ChangePasswordPage />;
            default: return <TeacherDashboardHomePage onNavigate={setCurrentPage} />;
        }
    };

    return (
        <DashboardLayout roleLabel="Teacher" navItems={navItems} currentPage={currentPage} onNavigate={setCurrentPage} onLogout={(e) => { e.preventDefault(); logout(); setView('landing'); }}>
            {renderPage()}
        </DashboardLayout>
    );
};

export default TeacherDashboard;
