import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { myEnrollments } from '../../services/enrollmentsService';
import { myFinalGrades, myResults } from '../../services/examinationsService';
import { myAttendanceSummary } from '../../services/attendanceService';
import { myChallans } from '../../services/feesService';
import { myComplaints } from '../../services/complaintsService';
import { listNotifications } from '../../services/notificationsService';
import { getMyStudentProfile } from '../../services/studentsService';
import { normalizeList } from '../../services/api';
import { CheckIcon, UserIcon, BookIcon, ClipboardIcon, FileIcon, BellIcon, ArrowRightIcon } from '../Icons';

const flattenEnrollments = (enrollments) =>
    enrollments.flatMap(e =>
        (e.course_registrations || []).map(r => ({ ...r, semester_name: e.semester_name }))
    );

const StudentDashboardHomePage = ({ onNavigate }) => {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([]);
    const [studentInfo, setStudentInfo] = useState(null);

    useEffect(() => {
        const load = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const [enr, grades, att, challans, complaints, notifs, profile] = await Promise.allSettled([
                    myEnrollments(token), myFinalGrades(token), myAttendanceSummary(token),
                    myChallans(token), myComplaints(token), listNotifications(token),
                    getMyStudentProfile(token),
                ]);
                const count = (r) => r.status === 'fulfilled' ? normalizeList(r.value).length : 0;
                const enrData = enr.status === 'fulfilled' ? normalizeList(enr.value) : [];
                const courseCount = flattenEnrollments(enrData).length;
                const attData = att.status === 'fulfilled' ? att.value : {};
                if (profile.status === 'fulfilled') setStudentInfo(profile.value);
                setStats([
                    { label: 'Enrolled Courses', value: courseCount.toString(), icon: <BookIcon size={20} />, color: '#3b82f6', bg: '#eff6ff' },
                    { label: 'Final Grades', value: count(grades).toString(), icon: <CheckIcon />, color: '#10b981', bg: '#f0fdf4' },
                    { label: 'Attendance', value: attData.percentage != null ? `${attData.percentage}%` : '—', icon: <ClipboardIcon size={20} />, color: '#f59e0b', bg: '#fffbeb', progress: attData.percentage || 0 },
                    { label: 'Fee Challans', value: count(challans).toString(), icon: <FileIcon />, color: '#8b5cf6', bg: '#f5f3ff' },
                    { label: 'My Complaints', value: count(complaints).toString(), icon: <BellIcon size={20} />, color: '#ef4444', bg: '#fef2f2' },
                    { label: 'Notifications', value: count(notifs).toString(), icon: <BellIcon size={20} />, color: '#06b6d4', bg: '#ecfeff' },
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
                    <h1>Welcome Back, <span className="highlight-text-welcome">{user?.username || 'Student'}</span> 👋</h1>
                    <p>Track your courses, grades, attendance, fees, and campus activities from your student portal.</p>
                    {studentInfo && (
                        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            <span><strong>Program:</strong> {studentInfo.program_name}</span>
                            <span><strong>Reg No:</strong> {studentInfo.registration_number}</span>
                            <span><strong>Batch:</strong> {studentInfo.batch_year}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="stats-grid">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card fade-up">
                        <div className="stat-header">
                            <div className="stat-icon-wrapper" style={{ backgroundColor: stat.bg, color: stat.color }}>{stat.icon}</div>
                            <div className="stat-info">
                                <span className="stat-label">{stat.label}</span>
                                <h3 className="stat-value">{stat.value}</h3>
                            </div>
                        </div>
                        {stat.progress !== undefined && stat.progress > 0 && (
                            <div className="stat-progress-container">
                                <div className="stat-progress-bar" style={{ width: `${stat.progress}%`, backgroundColor: stat.color }}></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="home-content-bottom">
                <div className="home-section quick-links-section fade-up">
                    <div className="section-header">
                        <div className="section-header-icon"><ArrowRightIcon /></div>
                        <h2 className="section-title">Quick Actions</h2>
                    </div>
                    <div className="quick-links-grid">
                        <button className="quick-link-btn" onClick={() => onNavigate('enrollments')}><div className="quick-link-icon"><BookIcon size={20} /></div><span>My Enrollments</span></button>
                        <button className="quick-link-btn" onClick={() => onNavigate('grades')}><div className="quick-link-icon"><CheckIcon /></div><span>My Grades</span></button>
                        <button className="quick-link-btn" onClick={() => onNavigate('attendance')}><div className="quick-link-icon"><ClipboardIcon size={20} /></div><span>My Attendance</span></button>
                        <button className="quick-link-btn" onClick={() => onNavigate('fees')}><div className="quick-link-icon"><FileIcon /></div><span>My Fees</span></button>
                        <button className="quick-link-btn" onClick={() => onNavigate('complaints')}><div className="quick-link-icon"><BellIcon size={20} /></div><span>My Complaints</span></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboardHomePage;
