import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyFacultyProfile } from '../../services/facultyService';
import DashboardLayout from '../shared/DashboardLayout';
import { LayoutDashboardIcon, BookIcon, ClipboardIcon, FileTextIcon, BellIcon, ShieldIcon, UserIcon } from '../Icons';
import TeacherDashboardHomePage from './DashboardHomePage';
import TeacherOnboardingPage from './Pages/TeacherOnboardingPage';
import {
    TeacherSectionsPage, TeacherAttendancePage, TeacherExaminationsPage,
    TeacherNotificationsPage, TeacherLeavesPage, TeacherAnnouncementsPage,
} from './Pages/TeacherModulePages';
import ChangePasswordPage from '../applicant/Pages/ChangePasswordPage';
import { LoadingSpinner } from '../shared/helpers';

const TeacherDashboard = ({ setView }) => {
    const { token, logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('home');
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileIncomplete, setProfileIncomplete] = useState(false);

    const checkProfile = async () => {
        setLoadingProfile(true);
        try {
            const profile = await getMyFacultyProfile(token);
            setProfileIncomplete(!profile.profile_completed);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingProfile(false);
        }
    };

    useEffect(() => {
        if (token) checkProfile();
    }, [token]);

    const navItems = [
        { id: 'home', label: 'Dashboard', icon: <LayoutDashboardIcon /> },
        { id: 'sections', label: 'My Sections', icon: <BookIcon size={20} /> },
        { id: 'attendance', label: 'Attendance', icon: <ClipboardIcon size={20} /> },
        { id: 'examinations', label: 'Examinations', icon: <FileTextIcon /> },
        { id: 'leaves', label: 'Leave Requests', icon: <ClipboardIcon size={20} /> },
        { id: 'announcements', label: 'Announcements', icon: <BellIcon size={20} /> },
        { id: 'notifications', label: 'Notifications', icon: <BellIcon size={20} /> },
        { id: 'change-password', label: 'Change Password', icon: <ShieldIcon /> },
    ];

    const renderPage = () => {
        switch (currentPage) {
            case 'home': return <TeacherDashboardHomePage onNavigate={setCurrentPage} />;
            case 'sections': return <TeacherSectionsPage />;
            case 'attendance': return <TeacherAttendancePage />;
            case 'examinations': return <TeacherExaminationsPage />;
            case 'leaves': return <TeacherLeavesPage />;
            case 'announcements': return <TeacherAnnouncementsPage />;
            case 'notifications': return <TeacherNotificationsPage />;
            case 'change-password': return <ChangePasswordPage />;
            default: return <TeacherDashboardHomePage onNavigate={setCurrentPage} />;
        }
    };

    if (loadingProfile) return <LoadingSpinner message="Loading teacher profile..." />;

    if (profileIncomplete) {
        return (
            <DashboardLayout roleLabel="Teacher" navItems={[{ id: 'home', label: 'Complete Profile', icon: <UserIcon /> }]} currentPage="home" onNavigate={() => {}} onLogout={(e) => { e.preventDefault(); logout(); setView('landing'); }}>
                <TeacherOnboardingPage onComplete={() => { setProfileIncomplete(false); setCurrentPage('home'); }} />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout roleLabel="Teacher" navItems={navItems} currentPage={currentPage} onNavigate={setCurrentPage} onLogout={(e) => { e.preventDefault(); logout(); setView('landing'); }}>
            {renderPage()}
        </DashboardLayout>
    );
};

export default TeacherDashboard;
