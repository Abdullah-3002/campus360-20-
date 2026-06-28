import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMySections } from '../../services/sectionsService';
import { listExaminations } from '../../services/examinationsService';
import { listAttendance } from '../../services/attendanceService';
import { listNotifications } from '../../services/notificationsService';
import { normalizeList } from '../../services/api';
import { CheckIcon, BookIcon, ClipboardIcon, FileIcon, BellIcon, ArrowRightIcon } from '../Icons';

const TeacherDashboardHomePage = ({ onNavigate }) => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([]);

    useEffect(() => {
        const load = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const [sections, exams, att, notifs] = await Promise.allSettled([
                    getMySections(token), listExaminations(token), listAttendance(token), listNotifications(token),
                ]);
                const count = (r) => r.status === 'fulfilled' ? normalizeList(r.value).length : 0;
                setStats([
                    { label: 'My Sections', value: count(sections).toString(), icon: <BookIcon size={20} />, color: '#3b82f6', bg: '#eff6ff' },
                    { label: 'Examinations', value: count(exams).toString(), icon: <FileIcon />, color: '#10b981', bg: '#f0fdf4' },
                    { label: 'Attendance Records', value: count(att).toString(), icon: <ClipboardIcon size={20} />, color: '#f59e0b', bg: '#fffbeb' },
                    { label: 'Notifications', value: count(notifs).toString(), icon: <BellIcon size={20} />, color: '#8b5cf6', bg: '#f5f3ff' },
                ]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, [token]);

    if (loading) return <div className="home-dashboard fade-in"><div className="loading-spinner">Loading dashboard...</div></div>;

    return (
        <div className="home-dashboard fade-in">
            <div className="welcome-banner fade-up">
                <div className="welcome-text">
                    <h1>Welcome Back, <span className="highlight-text-welcome">{user?.username || 'Teacher'}</span> 👋</h1>
                    <p>Manage your sections, mark attendance, enter exam marks, and stay updated with campus notifications.</p>
                </div>
            </div>
            <div className="stats-grid">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card fade-up">
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ backgroundColor: stat.bg, color: stat.color }}>{stat.icon}</div>
                            <div className="stat-info"><span className="stat-label">{stat.label}</span><h3 className="stat-value">{stat.value}</h3></div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="home-section quick-links-section fade-up">
                <div className="section-header"><div className="section-header-icon"><ArrowRightIcon /></div><h2 className="section-title">Quick Actions</h2></div>
                <div className="quick-links-grid">
                    <button className="quick-link-btn" onClick={() => onNavigate('sections')}><div className="quick-link-icon"><BookIcon size={20} /></div><span>My Sections</span></button>
                    <button className="quick-link-btn" onClick={() => onNavigate('attendance')}><div className="quick-link-icon"><ClipboardIcon size={20} /></div><span>Mark Attendance</span></button>
                    <button className="quick-link-btn" onClick={() => onNavigate('examinations')}><div className="quick-link-icon"><FileIcon /></div><span>Examinations</span></button>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboardHomePage;
