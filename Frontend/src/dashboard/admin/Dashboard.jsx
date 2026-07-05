import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { pageIdFromPath } from '../../routes/paths';
import { useDashboardNavigate } from '../../routes/useDashboardNavigate';
import { useFilteredNavItems } from '../../routes/navPermissions';
import RequirePermission from '../../routes/RequirePermission';
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
import AuditLogPage from './Pages/AuditLogPage';
import RolePermissionsPage from './Pages/RolePermissionsPage';
import SemestersPage from './Pages/SemestersPage';
import ChangePasswordPage from '../applicant/Pages/ChangePasswordPage';

const ADMIN_BASE = '/admin';

const AdminDashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const onNavigate = useDashboardNavigate(ADMIN_BASE);
    const currentPage = pageIdFromPath(location.pathname, ADMIN_BASE);

    const handleLogout = async (e) => {
        e.preventDefault();
        await logout();
        navigate('/');
    };

    const navItems = useMemo(() => [
        { id: 'home', label: 'Dashboard', icon: <LayoutDashboardIcon />, always: true },
        {
            id: 'academics-menu', label: 'Academics', icon: <BookIcon size={20} />,
            permissions: ['academics.view_department', 'academics.view_program', 'academics.view_course'],
            children: [
                { id: 'academics', label: 'Departments & Programs', permissions: ['academics.view_department', 'academics.view_program', 'academics.view_course'] },
                { id: 'semesters', label: 'Semesters', permission: 'academics.view_program' },
            ]
        },
        { id: 'credentials', label: 'Create Credentials', icon: <ShieldIcon size={20} />, permission: 'accounts.create_credentials' },
        { id: 'faculty', label: 'Faculty', icon: <UserIcon size={20} />, permission: 'faculty.view_faculty' },
        { id: 'admissions', label: 'Admissions', icon: <FileTextIcon />, permission: 'admissions.view_application' },
        { id: 'students', label: 'Students', icon: <UserIcon size={20} />, permission: 'students.view_student' },
        { id: 'sections', label: 'Sections', icon: <ClipboardIcon size={20} />, permissions: ['sections.view_section', 'sections.manage_section'] },
        { id: 'enrollments', label: 'Enrollments', icon: <FileTextIcon />, permission: 'enrollments.view_enrollment' },
        { id: 'examinations', label: 'Examinations', icon: <FileTextIcon />, permission: 'examinations.view_examination' },
        { id: 'attendance', label: 'Attendance', icon: <ClipboardIcon size={20} />, permission: 'attendance.view_attendance' },
        { id: 'notifications', label: 'Notifications', icon: <BellIcon size={20} />, permissions: ['announcements.view_announcement', 'announcements.manage_announcement'] },
        { id: 'fees', label: 'Fees', icon: <FileTextIcon />, permissions: ['fees.view_fees', 'fees.manage_fees'] },
        { id: 'complaints', label: 'Complaints', icon: <BellIcon size={20} />, permissions: ['complaints.view_complaint', 'complaints.manage_complaint'] },
        { id: 'audit-log', label: 'Audit Log', icon: <FileTextIcon />, permission: 'system.view_audit_log' },
        { id: 'role-permissions', label: 'Role Permissions', icon: <ShieldIcon size={20} />, permission: 'system.manage_role_permissions' },
        { id: 'change-password', label: 'Change Password', icon: <ShieldIcon />, always: true },
    ], []);

    const filteredNavItems = useFilteredNavItems(navItems);

    return (
        <DashboardLayout
            roleLabel="Administrator"
            navItems={filteredNavItems}
            currentPage={currentPage}
            onNavigate={onNavigate}
            onLogout={handleLogout}
        >
            <Routes>
                <Route index element={<AdminDashboardHomePage onNavigate={onNavigate} />} />
                <Route path="academics" element={
                    <RequirePermission permissions={['academics.view_department', 'academics.view_program', 'academics.view_course']}>
                        <AcademicsPage />
                    </RequirePermission>
                } />
                <Route path="semesters" element={
                    <RequirePermission permission="academics.view_program">
                        <SemestersPage />
                    </RequirePermission>
                } />
                <Route path="credentials" element={
                    <RequirePermission permission="accounts.create_credentials">
                        <CredentialsPage />
                    </RequirePermission>
                } />
                <Route path="faculty" element={
                    <RequirePermission permission="faculty.view_faculty">
                        <FacultyListingPage />
                    </RequirePermission>
                } />
                <Route path="admissions" element={
                    <RequirePermission permission="admissions.view_application">
                        <AdmissionsReviewPage />
                    </RequirePermission>
                } />
                <Route path="students" element={
                    <RequirePermission permission="students.view_student">
                        <StudentsListingPage />
                    </RequirePermission>
                } />
                <Route path="sections" element={
                    <RequirePermission permissions={['sections.view_section', 'sections.manage_section']}>
                        <SectionsListingPage />
                    </RequirePermission>
                } />
                <Route path="enrollments" element={
                    <RequirePermission permission="enrollments.view_enrollment">
                        <EnrollmentsListingPage />
                    </RequirePermission>
                } />
                <Route path="examinations" element={
                    <RequirePermission permission="examinations.view_examination">
                        <ExaminationsListingPage />
                    </RequirePermission>
                } />
                <Route path="attendance" element={
                    <RequirePermission permission="attendance.view_attendance">
                        <AttendanceListingPage />
                    </RequirePermission>
                } />
                <Route path="notifications" element={
                    <RequirePermission permissions={['announcements.view_announcement', 'announcements.manage_announcement']}>
                        <NotificationsListingPage />
                    </RequirePermission>
                } />
                <Route path="fees" element={
                    <RequirePermission permissions={['fees.view_fees', 'fees.manage_fees']}>
                        <FeesListingPage />
                    </RequirePermission>
                } />
                <Route path="complaints" element={
                    <RequirePermission permissions={['complaints.view_complaint', 'complaints.manage_complaint']}>
                        <ComplaintsListingPage />
                    </RequirePermission>
                } />
                <Route path="audit-log" element={
                    <RequirePermission permission="system.view_audit_log">
                        <AuditLogPage />
                    </RequirePermission>
                } />
                <Route path="role-permissions" element={
                    <RequirePermission permission="system.manage_role_permissions">
                        <RolePermissionsPage />
                    </RequirePermission>
                } />
                <Route path="change-password" element={<ChangePasswordPage />} />
                <Route path="*" element={<Navigate to={ADMIN_BASE} replace />} />
            </Routes>
        </DashboardLayout>
    );
};

export default AdminDashboard;
