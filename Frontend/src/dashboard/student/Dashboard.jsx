import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../shared/DashboardLayout';
import { LayoutDashboardIcon, BookIcon, ClipboardIcon, FileTextIcon, BellIcon, ShieldIcon, UserIcon } from '../Icons';
import StudentDashboardHomePage from './DashboardHomePage';
import { MyEnrollmentsPage, MyGradesPage, MyAttendancePage, MyFeesPage, MyComplaintsPage, MyNotificationsPage } from './Pages/StudentModulePages';
import ChangePasswordPage from '../applicant/Pages/ChangePasswordPage';
import { LoadingSpinner } from '../shared/helpers';

const StudentDashboard = ({ setView }) => {
    const { token, logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('home');
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileIncomplete, setProfileIncomplete] = useState(false);
    const [submittingProfile, setSubmittingProfile] = useState(false);

    const [profileForm, setProfileForm] = useState({
        blood_group: 'A+',
        medical_conditions: '',
        disabilities: '',
        guardian_phone: '',
        guardian_occupation: '',
        residential_address: ''
    });

    const checkProfile = async () => {
        setLoadingProfile(true);
        try {
            const res = await axios.get('http://localhost:8000/api/students/me/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const stData = res.data;
            const prof = stData.profile || {};
            
            // Check if essential fields are completed
            if (!prof.blood_group || !prof.guardian_phone || !prof.guardian_occupation || !prof.residential_address) {
                setProfileIncomplete(true);
                setProfileForm({
                    blood_group: prof.blood_group || 'A+',
                    medical_conditions: prof.medical_conditions || '',
                    disabilities: prof.disabilities || '',
                    guardian_phone: prof.guardian_phone || '',
                    guardian_occupation: prof.guardian_occupation || '',
                    residential_address: prof.residential_address || prof.permanent_address || ''
                });
            } else {
                setProfileIncomplete(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingProfile(false);
        }
    };

    useEffect(() => {
        if (token) checkProfile();
    }, [token]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!profileForm.blood_group || !profileForm.guardian_phone || !profileForm.guardian_occupation || !profileForm.residential_address) {
            alert('Please fill in all required profile fields.');
            return;
        }
        setSubmittingProfile(true);
        try {
            await axios.put('http://localhost:8000/api/students/me/profile/', profileForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Profile completed successfully! Welcome to your dashboard.');
            setProfileIncomplete(false);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to update profile');
        } finally {
            setSubmittingProfile(false);
        }
    };

    const navItems = [
        { id: 'home', label: 'Dashboard', icon: <LayoutDashboardIcon /> },
        { id: 'enrollments', label: 'My Enrollments', icon: <BookIcon size={20} /> },
        { id: 'grades', label: 'My Grades', icon: <FileTextIcon /> },
        { id: 'attendance', label: 'My Attendance', icon: <ClipboardIcon size={20} /> },
        { id: 'fees', label: 'My Fees', icon: <FileTextIcon /> },
        { id: 'complaints', label: 'My Complaints', icon: <BellIcon size={20} /> },
        { id: 'notifications', label: 'Notifications', icon: <BellIcon size={20} /> },
        { id: 'change-password', label: 'Change Password', icon: <ShieldIcon /> },
    ];

    const renderPage = () => {
        switch (currentPage) {
            case 'home': return <StudentDashboardHomePage onNavigate={setCurrentPage} />;
            case 'enrollments': return <MyEnrollmentsPage />;
            case 'grades': return <MyGradesPage />;
            case 'attendance': return <MyAttendancePage />;
            case 'fees': return <MyFeesPage />;
            case 'complaints': return <MyComplaintsPage />;
            case 'notifications': return <MyNotificationsPage />;
            case 'change-password': return <ChangePasswordPage />;
            default: return <StudentDashboardHomePage onNavigate={setCurrentPage} />;
        }
    };

    if (loadingProfile) return <LoadingSpinner message="Checking student profile status..." />;

    return (
        <DashboardLayout roleLabel="Student" navItems={profileIncomplete ? [{ id: 'home', label: 'Complete Profile', icon: <UserIcon /> }] : navItems} currentPage={currentPage} onNavigate={setCurrentPage} onLogout={(e) => { e.preventDefault(); logout(); setView('landing'); }}>
            {profileIncomplete ? (
                <div className="page-container fade-in">
                    <div className="form-card" style={{ maxWidth: '750px', margin: '30px auto', borderTop: '4px solid #ef4444' }}>
                        <div className="section-header">
                            <div className="section-header-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}><UserIcon /></div>
                            <div>
                                <h2 className="section-title">Complete Your Student Profile</h2>
                                <p style={{ color: '#666', margin: '4px 0 0 0' }}>Before exploring your campus dashboard, please complete your remaining student profile details.</p>
                            </div>
                        </div>

                        <form onSubmit={handleProfileSubmit} style={{ marginTop: '20px' }}>
                            <div className="two-column-grid" style={{ marginBottom: '20px' }}>
                                <div className="field-group">
                                    <label className="field-label">Blood Group <span className="required">*</span></label>
                                    <select className="field-input field-select" value={profileForm.blood_group} onChange={e => setProfileForm({ ...profileForm, blood_group: e.target.value })}>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Guardian Phone Number <span className="required">*</span></label>
                                    <input type="text" className="field-input" placeholder="03001234567" value={profileForm.guardian_phone} onChange={e => setProfileForm({ ...profileForm, guardian_phone: e.target.value })} required />
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Guardian Occupation <span className="required">*</span></label>
                                    <input type="text" className="field-input" placeholder="e.g. Business / Government Employee" value={profileForm.guardian_occupation} onChange={e => setProfileForm({ ...profileForm, guardian_occupation: e.target.value })} required />
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Residential Address <span className="required">*</span></label>
                                    <input type="text" className="field-input" placeholder="Current residential address" value={profileForm.residential_address} onChange={e => setProfileForm({ ...profileForm, residential_address: e.target.value })} required />
                                </div>
                            </div>

                            <div className="two-column-grid" style={{ marginBottom: '20px' }}>
                                <div className="field-group">
                                    <label className="field-label">Medical Conditions (Optional)</label>
                                    <input type="text" className="field-input" placeholder="None or specify" value={profileForm.medical_conditions} onChange={e => setProfileForm({ ...profileForm, medical_conditions: e.target.value })} />
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Disabilities (Optional)</label>
                                    <input type="text" className="field-input" placeholder="None or specify" value={profileForm.disabilities} onChange={e => setProfileForm({ ...profileForm, disabilities: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn-save" disabled={submittingProfile}>
                                    {submittingProfile ? 'Saving Details...' : 'Save Profile & Continue to Dashboard'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : renderPage()}
        </DashboardLayout>
    );
};

export default StudentDashboard;
