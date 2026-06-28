import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../shared/DashboardLayout';
import {
    LayoutDashboardIcon, BookIcon, UserIcon, FileTextIcon, ClipboardIcon,
    ShieldIcon, BellIcon
} from '../Icons';
import AdminDashboardHomePage from './DashboardHomePage';
import AcademicsPage from './Pages/AcademicsPage';
import FacultyListingPage from './Pages/FacultyListingPage';
import StudentsListingPage from './Pages/StudentsListingPage';
import SectionsListingPage from './Pages/SectionsListingPage';
import EnrollmentsListingPage from './Pages/EnrollmentsListingPage';
import ExaminationsListingPage from './Pages/ExaminationsListingPage';
import AttendanceListingPage from './Pages/AttendanceListingPage';
import NotificationsListingPage from './Pages/NotificationsListingPage';
import FeesListingPage from './Pages/FeesListingPage';
import ComplaintsListingPage from './Pages/ComplaintsListingPage';
import AdmissionsReviewPage from './Pages/AdmissionsReviewPage';
import CredentialsPage from './Pages/CredentialsPage';
import ChangePasswordPage from '../applicant/Pages/ChangePasswordPage';

const AdminDashboard = ({ setView }) => {
    const { user, logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('home');

    const handleLogout = (e) => {
        e.preventDefault();
        logout();
        setView('landing');
    };

    const navItems = [
        { id: 'home', label: 'Dashboard', icon: <LayoutDashboardIcon /> },
        {
            id: 'academics-menu', label: 'Academics', icon: <BookIcon size={20} />,
            children: [
                { id: 'academics', label: 'Departments & Programs' },
            ]
        },
        { id: 'credentials', label: 'Create Credentials', icon: <ShieldIcon size={20} /> },
        { id: 'faculty', label: 'Faculty', icon: <UserIcon size={20} /> },
        { id: 'admissions', label: 'Admissions', icon: <FileTextIcon /> },
        { id: 'students', label: 'Students', icon: <UserIcon size={20} /> },
        { id: 'sections', label: 'Sections', icon: <ClipboardIcon size={20} /> },
        { id: 'enrollments', label: 'Enrollments', icon: <FileTextIcon /> },
        { id: 'examinations', label: 'Examinations', icon: <FileTextIcon /> },
        { id: 'attendance', label: 'Attendance', icon: <ClipboardIcon size={20} /> },
        { id: 'notifications', label: 'Notifications', icon: <BellIcon size={20} /> },
        { id: 'fees', label: 'Fees', icon: <FileTextIcon /> },
        { id: 'complaints', label: 'Complaints', icon: <BellIcon size={20} /> },
        { id: 'change-password', label: 'Change Password', icon: <ShieldIcon /> },
    ];

    const renderPage = () => {
        switch (currentPage) {
            case 'home': return <AdminDashboardHomePage onNavigate={setCurrentPage} />;
            case 'academics': return <AcademicsPage />;
            case 'credentials': return <CredentialsPage />;
            case 'faculty': return <FacultyListingPage />;
            case 'admissions': return <AdmissionsReviewPage />;
            case 'students': return <StudentsListingPage />;
            case 'sections': return <SectionsListingPage />;
            case 'enrollments': return <EnrollmentsListingPage />;
            case 'examinations': return <ExaminationsListingPage />;
            case 'attendance': return <AttendanceListingPage />;
            case 'notifications': return <NotificationsListingPage />;
            case 'fees': return <FeesListingPage />;
            case 'complaints': return <ComplaintsListingPage />;
            case 'change-password': return <ChangePasswordPage />;
            default: return <AdminDashboardHomePage onNavigate={setCurrentPage} />;
        }
    };

    return (
        <DashboardLayout
            roleLabel="Administrator"
            navItems={navItems}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
        >
            {renderPage()}
        </DashboardLayout>
    );
};

export default AdminDashboard;
