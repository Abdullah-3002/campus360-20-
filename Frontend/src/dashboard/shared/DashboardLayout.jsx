import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../Dashboard.css';
import { SearchIcon, UserIcon, LogOutIcon } from '../Icons';

const DashboardLayout = ({
    roleLabel,
    navItems,
    currentPage,
    onNavigate,
    onLogout,
    children,
    profileImage,
}) => {
    const { user } = useAuth();
    const [profileOpen, setProfileOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState({});

    const userInfo = user || { username: 'User' };

    const toggleMenu = (key) => {
        setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const isActive = (item) => {
        if (item.id === currentPage) return true;
        if (item.children?.some(c => c.id === currentPage)) return true;
        return false;
    };

    return (
        <div className="dashboard-layout fade-in">
            <aside className="dashboard-sidebar">
                <div className="sidebar-user-card compact-card">
                    <img
                        src={profileImage || '/student-avatar.jpg'}
                        alt={userInfo.username}
                        className="sidebar-avatar-compact"
                        onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${userInfo.username}&background=3B5BDB&color=fff`;
                        }}
                    />
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-id-compact">{userInfo.username}</div>
                        <div className="sidebar-user-role-compact">{roleLabel}</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <React.Fragment key={item.id}>
                            {item.children ? (
                                <>
                                    <a
                                        className={`sidebar-link dropdown-link ${isActive(item) ? 'active' : ''}`}
                                        onClick={() => toggleMenu(item.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <span className="sidebar-link-icon">{item.icon}</span>
                                        <span className="sidebar-text-clamp">{item.label}</span>
                                        <span className={`sidebar-link-arrow ${openMenus[item.id] ? 'open' : ''}`}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </span>
                                    </a>
                                    {openMenus[item.id] && (
                                        <div className="sidebar-submenu">
                                            {item.children.map((child) => (
                                                <a
                                                    key={child.id}
                                                    className={`sidebar-sublink ${currentPage === child.id ? 'active' : ''}`}
                                                    onClick={() => onNavigate(child.id)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {child.label}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <a
                                    className={`sidebar-link ${currentPage === item.id ? 'active' : ''}`}
                                    onClick={() => onNavigate(item.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span className="sidebar-link-icon">{item.icon}</span>
                                    {item.label}
                                </a>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="header-logo-icon" style={{ display: 'flex', alignItems: 'center' }}>
                            <img src="/campus360-logo.png" alt="Campus 360" style={{ height: '36px', objectFit: 'contain', borderRadius: '5px' }} />
                        </div>
                        <div className="header-logo-text" style={{ fontWeight: '700', fontSize: '1.25rem', color: '#1e293b', letterSpacing: '-0.5px' }}>
                            Campus 360
                        </div>
                    </div>
                    <div className="header-center">
                        <div className="search-bar">
                            <span style={{ color: '#9ca3af', display: 'flex' }}><SearchIcon /></span>
                            <input type="text" placeholder="Search..." className="search-input" />
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="header-profile" onClick={() => setProfileOpen(!profileOpen)}>
                            <img
                                src={profileImage || '/student-avatar.jpg'}
                                alt={userInfo.username}
                                title={userInfo.username}
                                className="header-avatar"
                                onError={(e) => {
                                    e.target.src = `https://ui-avatars.com/api/?name=${userInfo.username}&background=3B5BDB&color=fff`;
                                }}
                            />
                            <div className={`dropdown-menu ${profileOpen ? 'show' : ''}`}>
                                <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); setProfileOpen(false); }}>
                                    <UserIcon /> Profile
                                </a>
                                <div className="dropdown-divider"></div>
                                <a href="#" onClick={onLogout} className="dropdown-item text-danger">
                                    <LogOutIcon /> Logout
                                </a>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="dashboard-content-wrapper">
                    {children}
                </div>

                <footer className="dashboard-footer">
                    <div>2026 &copy; Campus 360. All rights reserved.</div>
                    <div>Developed by Campus 360 Group</div>
                </footer>
            </main>
        </div>
    );
};

export default DashboardLayout;
