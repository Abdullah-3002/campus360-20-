import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listStudents } from '../../services/studentsService';
import { listFaculty } from '../../services/facultyService';
import { listSections } from '../../services/sectionsService';
import { listEnrollments } from '../../services/enrollmentsService';
import { listExaminations } from '../../services/examinationsService';
import { listAllComplaints } from '../../services/complaintsService';
import { listChallans } from '../../services/feesService';
import { normalizeList } from '../../services/api';
import { CheckIcon, UserIcon, BookIcon, ClipboardIcon, FileIcon, BellIcon, PlusIcon, ArrowRightIcon } from '../Icons';

const AdminDashboardHomePage = ({ onNavigate }) => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([
        { label: 'Students', value: '0', icon: <UserIcon size={20} />, color: '#3b82f6', bg: '#eff6ff' },
        { label: 'Faculty', value: '0', icon: <BookIcon size={20} />, color: '#10b981', bg: '#f0fdf4' },
        { label: 'Sections', value: '0', icon: <ClipboardIcon />, color: '#f59e0b', bg: '#fffbeb' },
        { label: 'Enrollments', value: '0', icon: <FileIcon />, color: '#4169E1', bg: '#eef2ff' },
    ]);

    useEffect(() => {
        const load = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const [students, faculty, sections, enrollments, exams, complaints, challans] = await Promise.allSettled([
                    listStudents(token), listFaculty(token), listSections(token),
                    listEnrollments(token), listExaminations(token),
                    listAllComplaints(token), listChallans(token),
                ]);
                const count = (r) => r.status === 'fulfilled' ? normalizeList(r.value).length : 0;
                setStats([
                    { label: 'Students', value: count(students).toLocaleString(), icon: <UserIcon size={20} />, color: '#3b82f6', bg: '#eff6ff' },
                    { label: 'Faculty', value: count(faculty).toLocaleString(), icon: <BookIcon size={20} />, color: '#10b981', bg: '#f0fdf4' },
                    { label: 'Sections', value: count(sections).toLocaleString(), icon: <ClipboardIcon />, color: '#f59e0b', bg: '#fffbeb' },
                    { label: 'Enrollments', value: count(enrollments).toLocaleString(), icon: <FileIcon />, color: '#4169E1', bg: '#eef2ff' },
                    { label: 'Examinations', value: count(exams).toLocaleString(), icon: <CheckIcon />, color: '#06b6d4', bg: '#ecfeff' },
                    { label: 'Complaints', value: count(complaints).toLocaleString(), icon: <BellIcon size={20} />, color: '#ef4444', bg: '#fef2f2' },
                    { label: 'Challans', value: count(challans).toLocaleString(), icon: <FileIcon />, color: '#fbbf24', bg: '#fffbeb' },
                ]);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    if (loading) return <div className="home-dashboard fade-in"><div className="loading-spinner">Loading dashboard...</div></div>;

    return (
        <div className="home-dashboard fade-in">
            <div className="welcome-banner fade-up">
                <div className="welcome-text">
                    <h1>Welcome Back, <span className="highlight-text-welcome">{user?.username || 'Admin'}</span> 👋</h1>
                    <p>Manage university operations, monitor key metrics, and oversee all campus modules from this dashboard.</p>
                </div>
            </div>

            <div className="stats-grid">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card fade-up" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ backgroundColor: stat.bg, color: stat.color }}>{stat.icon}</div>
                            <div className="stat-info">
                                <span className="stat-label">{stat.label}</span>
                                <h3 className="stat-value">{stat.value}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="home-content-bottom">
                <div className="home-section activity-section fade-up">
                    <div className="section-header">
                        <div className="section-header-icon"><BellIcon /></div>
                        <h2 className="section-title">System Overview</h2>
                    </div>
                    <div className="notification-list">
                        <div className="notification-item">
                            <div className="notif-dot info"></div>
                            <div className="notif-content">
                                <span className="notif-title">Campus 360 Admin Portal</span>
                                <span className="notif-time">All modules are active</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="home-section quick-links-section fade-up">
                    <div className="section-header">
                        <div className="section-header-icon"><ArrowRightIcon /></div>
                        <h2 className="section-title">Quick Actions</h2>
                    </div>
                    <div className="quick-links-grid">
                        <button className="quick-link-btn" onClick={() => onNavigate('students')}><div className="quick-link-icon"><UserIcon size={20} /></div><span>Students</span></button>
                        <button className="quick-link-btn" onClick={() => onNavigate('faculty')}><div className="quick-link-icon"><BookIcon size={20} /></div><span>Faculty</span></button>
                        <button className="quick-link-btn" onClick={() => onNavigate('examinations')}><div className="quick-link-icon"><FileIcon /></div><span>Examinations</span></button>
                        <button className="quick-link-btn" onClick={() => onNavigate('complaints')}><div className="quick-link-icon"><BellIcon size={20} /></div><span>Complaints</span></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardHomePage;
