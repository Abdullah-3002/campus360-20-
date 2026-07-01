import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listStudents } from '../../services/studentsService';
import { listAllComplaints } from '../../services/complaintsService';
import { listNotifications } from '../../services/notificationsService';
import { listChallans } from '../../services/feesService';
import { normalizeList } from '../../services/api';
import { UserIcon, BellIcon, FileIcon, ClipboardIcon, ArrowRightIcon } from '../Icons';

const StaffDashboardHomePage = ({ onNavigate }) => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([]);

    useEffect(() => {
        const load = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const [students, complaints, notifs, challans] = await Promise.allSettled([
                    listStudents(token), listAllComplaints(token), listNotifications(token), listChallans(token),
                ]);
                const count = (r) => r.status === 'fulfilled' ? normalizeList(r.value).length : 0;
                setStats([
                    { label: 'Students', value: count(students).toLocaleString(), icon: <UserIcon size={20} />, color: '#3b82f6', bg: '#eff6ff' },
                    { label: 'Complaints', value: count(complaints).toString(), icon: <BellIcon size={20} />, color: '#ef4444', bg: '#fef2f2' },
                    { label: 'Notifications', value: count(notifs).toString(), icon: <BellIcon size={20} />, color: '#4169E1', bg: '#eef2ff' },
                    { label: 'Challans', value: count(challans).toString(), icon: <FileIcon />, color: '#f59e0b', bg: '#fffbeb' },
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
                    <h1>Welcome Back, <span className="highlight-text-welcome">{user?.username || 'Staff'}</span> 👋</h1>
                    <p>Support student services, manage complaints, and handle fee operations from your staff portal.</p>
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
                    <button className="quick-link-btn" onClick={() => onNavigate('students')}><div className="quick-link-icon"><UserIcon size={20} /></div><span>Students</span></button>
                    <button className="quick-link-btn" onClick={() => onNavigate('complaints')}><div className="quick-link-icon"><BellIcon size={20} /></div><span>Complaints</span></button>
                    <button className="quick-link-btn" onClick={() => onNavigate('fees')}><div className="quick-link-icon"><FileIcon /></div><span>Fees</span></button>
                    <button className="quick-link-btn" onClick={() => onNavigate('notifications')}><div className="quick-link-icon"><ClipboardIcon size={20} /></div><span>Notifications</span></button>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboardHomePage;
