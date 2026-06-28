// src/dashboard/applicant/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getApplicantProfile, getMyDocuments, getAcademicRecords, getMyApplications, isApplicationLocked, hasRejectedApplication } from '../../services/admissionService';
import '../../Dashboard.css';


// Import Icons
import { 
    SearchIcon, 
    LayoutDashboardIcon, 
    FileTextIcon, 
    UserIcon, 
    MapPinIcon, 
    PhoneIcon, 
    ShieldIcon, 
    LogOutIcon,
    BookIcon,
    FileIcon
} from '../Icons';

// Import Profile Tabs
import PersonalDetailsTab from './ProfileTabs/PersonalDetailsTab';
import ResidenceDetailsTab from './ProfileTabs/ResidenceDetailsTab';
import EmergencyContactTab from './ProfileTabs/EmergencyContactTab';
import GuardianDetailsTab from './ProfileTabs/GuardianDetailsTab';

// Import Pages
import DashboardHomePage from './DashboardHomePage';
import PersonalDocumentsPage from './Pages/PersonalDocumentsPage';
import AcademicInformationPage from './Pages/AcademicInformationPage';
import AddAcademicInfoPage from './Pages/AddAcademicInfoPage';
import AdmissionListingPage from './Pages/AdmissionListingPage';
import AdmissionFormPage from './Pages/AdmissionFormPage';
import ChangePasswordPage from './Pages/ChangePasswordPage';
import RejectedApplicationView from './Pages/RejectedApplicationView';

// Sequential order of tabs
const TAB_ORDER = ['personal', 'residence', 'emergency', 'guardian'];

// ========== VALIDATION FUNCTIONS ==========

const isPersonalDetailsComplete = (profileData) => {
    const requiredFields = ['firstName', 'lastName', 'fatherName', 'cnic', 'gender', 'cellPhone'];
    for (const field of requiredFields) {
        if (!profileData[field] || profileData[field].toString().trim() === '') {
            return false;
        }
    }
    return true;
};

const isResidenceDetailsComplete = (profileData) => {
    const residence = profileData.residence || {};
    return !!(residence.perm_country && residence.perm_state && residence.perm_city && residence.perm_address);
};

const isEmergencyContactComplete = (profileData) => {
    const emergency = profileData.emergency || {};
    return !!(emergency.name && emergency.relation && emergency.phone);
};

const isGuardianDetailsComplete = (profileData) => {
    const guardian = profileData.guardian || {};
    return !!(guardian.name && guardian.cnic && guardian.relation);
};

// Get the highest completed tab index
const getHighestCompletedTab = (profileData) => {
    if (isPersonalDetailsComplete(profileData)) {
        if (isResidenceDetailsComplete(profileData)) {
            if (isEmergencyContactComplete(profileData)) {
                if (isGuardianDetailsComplete(profileData)) {
                    return 3;
                }
                return 2;
            }
            return 1;
        }
        return 0;
    }
    return -1;
};

// Check if a tab can be accessed (only current or next)
const canAccessTab = (profileData, targetTab) => {
    const targetIndex = TAB_ORDER.indexOf(targetTab);
    const highestCompleted = getHighestCompletedTab(profileData);
    return targetIndex <= highestCompleted + 1;
};

// Get the next required tab to complete
const getNextRequiredTab = (profileData) => {
    if (!isPersonalDetailsComplete(profileData)) return 'personal';
    if (!isResidenceDetailsComplete(profileData)) return 'residence';
    if (!isEmergencyContactComplete(profileData)) return 'emergency';
    if (!isGuardianDetailsComplete(profileData)) return 'guardian';
    return null;
};

// Check if all profile tabs are complete
const isProfileComplete = (profileData) => {
    return isPersonalDetailsComplete(profileData) && 
           isResidenceDetailsComplete(profileData) && 
           isEmergencyContactComplete(profileData) && 
           isGuardianDetailsComplete(profileData);
};

// Check if all required documents are uploaded
const hasAllDocuments = (documents) => {
    const requiredDocuments = ['cnic_front', 'cnic_back', 'domicile', 'photograph'];
    const uploadedTypes = documents.map(doc => doc.document_type);
    
    console.log('Required documents:', requiredDocuments);
    console.log('Uploaded types:', uploadedTypes);
    
    const result = requiredDocuments.every(type => uploadedTypes.includes(type));
    console.log('Has all documents:', result);
    
    return result;
};

// Check if academic records exist
const hasAcademicRecords = (records) => {
    return records && records.length > 0;
};

// ========== MAIN DASHBOARD COMPONENT ==========

const Dashboard = ({ setView, user }) => {
    const { token, user: authUser, logout: authLogout } = useAuth();
    const [activeTab, setActiveTab] = useState('personal');
    const [profileData, setProfileData] = useState(() => {
        const saved = localStorage.getItem('profileData');
        return saved ? JSON.parse(saved) : {
            firstName: '', lastName: '', fatherName: '', username: '', dob: '', religion: '', 
            cellPhone: '', disability: false, gender: '', cnic: '', maritalStatus: '', 
            nationality: '', profileImage: null,
            residence: {
                perm_country: '',
                perm_state: '',
                perm_city: '',
                perm_address: '',
            },
            emergency: {
                name: '',
                relation: '',
                phone: '',
            },
            guardian: {
                name: '',
                cnic: '',
                relation: '',
            }
        };
    });
    
    const [documents, setDocuments] = useState([]);
    const [academicRecords, setAcademicRecords] = useState([]);
    const [applications, setApplications] = useState([]);
    const [isLocked, setIsLocked] = useState(false);
    const [isRejected, setIsRejected] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const [currentPage, setCurrentPage] = useState('home');
    const [profileOpen, setProfileOpen] = useState(false);
    const [admissionOpen, setAdmissionOpen] = useState(true);
    const studentInfo = authUser || user || { username: 'Student', user_id: 'N/A' };
    
    const initialLoadDone = useRef(false);
    const isMounted = useRef(true);

    // Function to refresh documents from API
    const refreshDocuments = useCallback(async () => {
        if (!token || !isMounted.current) return;
        try {
            const docs = await getMyDocuments(token);
            console.log('Refreshed documents from API:', docs);
            if (isMounted.current) {
                setDocuments(Array.isArray(docs) ? docs : []);
            }
        } catch (error) {
            console.error('Failed to refresh documents:', error);
        }
    }, [token]);

    // Function to refresh academic records from API
    const refreshAcademicRecords = useCallback(async () => {
        if (!token || !isMounted.current) return;
        try {
            const records = await getAcademicRecords(token);
            console.log('Refreshed academic records:', records);
            if (isMounted.current) {
                setAcademicRecords(Array.isArray(records) ? records : []);
            }
        } catch (error) {
            console.error('Failed to refresh academic records:', error);
        }
    }, [token]);

    const refreshApplications = useCallback(async () => {
        if (!token || !isMounted.current) return;
        try {
            const apps = await getMyApplications(token);
            const appsArray = Array.isArray(apps) ? apps : (apps?.results || []);
            if (isMounted.current) {
                setApplications(appsArray);
                setIsLocked(isApplicationLocked(appsArray));
                setIsRejected(hasRejectedApplication(appsArray));
            }
        } catch (error) {
            console.error('Failed to refresh applications:', error);
        }
    }, [token]);

    useEffect(() => {
        isMounted.current = true;
        
        const loadData = async () => {
            if (!token) {
                if (isMounted.current) setLoading(false);
                return;
            }
            
            // Prevent multiple loads
            if (initialLoadDone.current) {
                if (isMounted.current) setLoading(false);
                return;
            }
            initialLoadDone.current = true;
            
            try {
                const profile = await getApplicantProfile(token, studentInfo.username);
                if (isMounted.current) setProfileData(prev => ({ ...prev, ...profile }));
                
                const docs = await getMyDocuments(token);
                console.log('Loaded documents from API:', docs);
                if (isMounted.current) setDocuments(Array.isArray(docs) ? docs : []);
                
                const records = await getAcademicRecords(token);
                console.log('Loaded academic records from API:', records);
                if (isMounted.current) setAcademicRecords(Array.isArray(records) ? records : []);

                const apps = await getMyApplications(token);
                const appsArray = Array.isArray(apps) ? apps : (apps?.results || []);
                if (isMounted.current) {
                    setApplications(appsArray);
                    setIsLocked(isApplicationLocked(appsArray));
                    setIsRejected(hasRejectedApplication(appsArray));
                }
            } catch (error) {
                console.error('Failed to load data:', error);
                if (isMounted.current) {
                    setDocuments([]);
                    setAcademicRecords([]);
                }
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };
        
        loadData();
        
        return () => {
            isMounted.current = false;
        };
    }, [token, studentInfo.username]);

    useEffect(() => {
        localStorage.setItem('profileData', JSON.stringify(profileData));
    }, [profileData]);

    const handleProfileChange = (key, value) => {
        setProfileData(prev => ({ ...prev, [key]: value }));
    };

    const handleNestedProfileChange = (category, key, value) => {
        setProfileData(prev => ({
            ...prev,
            [category]: { ...prev[category], [key]: value }
        }));
    };

    const handleLogout = (e) => {
        e.preventDefault();
        authLogout();
        setView('landing');
    };

    // Tab navigation with sequential validation
    const navigateToTab = (tabName) => {
        if (!canAccessTab(profileData, tabName)) {
            const nextRequired = getNextRequiredTab(profileData);
            alert(`Please complete ${nextRequired === 'personal' ? 'Personal Details' : 
                   nextRequired === 'residence' ? 'Address Details' :
                   nextRequired === 'emergency' ? 'Emergency Contact' : 'Guardian Details'} first.`);
            return;
        }
        setActiveTab(tabName);
        setCurrentPage('profile');
    };

    // Navigation to Personal Documents - requires Personal Details
    const navigateToPersonalDocuments = () => {
        if (!isPersonalDetailsComplete(profileData)) {
            alert('Please complete your Personal Details first before accessing Documents.');
            setCurrentPage('profile');
            setActiveTab('personal');
            return;
        }
        setCurrentPage('personal-docs');
    };

    // Navigation to Academic Information - requires ALL Personal Documents
    const navigateToAcademicInfo = () => {
        console.log('=== navigateToAcademicInfo Debug ===');
        console.log('Profile complete:', isProfileComplete(profileData));
        console.log('Documents array:', documents);
        console.log('Document types:', documents.map(doc => doc.document_type));
        console.log('Has all documents:', hasAllDocuments(documents));
        
        if (!isProfileComplete(profileData)) {
            const nextRequired = getNextRequiredTab(profileData);
            alert(`Please complete all profile sections first. Next: ${nextRequired === 'personal' ? 'Personal Details' : 
                   nextRequired === 'residence' ? 'Address Details' :
                   nextRequired === 'emergency' ? 'Emergency Contact' : 'Guardian Details'}`);
            setCurrentPage('profile');
            setActiveTab(nextRequired || 'personal');
            return;
        }
        if (!hasAllDocuments(documents)) {
            alert('Please upload all required Personal Documents (CNIC Front, CNIC Back, Domicile, Photograph) first.');
            setCurrentPage('personal-docs');
            return;
        }
        setCurrentPage('academic-info');
    };

    // Navigation to Application List - requires ALL profile tabs, ALL documents, AND academic records
    const navigateToApplicationList = () => {
        console.log('=== navigateToApplicationList Debug ===');
        console.log('Profile complete:', isProfileComplete(profileData));
        console.log('Has all documents:', hasAllDocuments(documents));
        console.log('Academic records:', academicRecords);
        console.log('Has academic records:', hasAcademicRecords(academicRecords));
        
        if (!isProfileComplete(profileData)) {
            const nextRequired = getNextRequiredTab(profileData);
            alert(`Please complete all profile sections first. Next: ${nextRequired === 'personal' ? 'Personal Details' : 
                   nextRequired === 'residence' ? 'Address Details' :
                   nextRequired === 'emergency' ? 'Emergency Contact' : 'Guardian Details'}`);
            setCurrentPage('profile');
            setActiveTab(nextRequired || 'personal');
            return;
        }
        if (!hasAllDocuments(documents)) {
            alert('Please upload all required Personal Documents (CNIC Front, CNIC Back, Domicile, Photograph) first.');
            setCurrentPage('personal-docs');
            return;
        }
        if (!hasAcademicRecords(academicRecords)) {
            alert('Please add your Academic Information (Matric, Intermediate, etc.) first.');
            setCurrentPage('academic-info');
            return;
        }
        setCurrentPage('application-list');
    };

    // Navigation to New Application - requires ALL profile tabs, ALL documents, AND academic records, AND no existing application
    const navigateToNewApplication = async () => {
        if (isLocked) {
            alert('Your application has already been submitted. You cannot create a new one.');
            setCurrentPage('application-list');
            return;
        }

        // First, check if there's an existing application
        try {
            const existingApps = await getMyApplications(token);
            const appsArray = Array.isArray(existingApps) ? existingApps : (existingApps?.results || []);
            
            if (appsArray.length > 0) {
                alert('You already have a submitted application.');
                setCurrentPage('application-list');
                return;
            }
        } catch (error) {
            console.error('Failed to check existing applications:', error);
            // Continue with other checks even if this fails
        }
        
        if (!isProfileComplete(profileData)) {
            const nextRequired = getNextRequiredTab(profileData);
            alert(`Please complete all profile sections first. Next: ${nextRequired === 'personal' ? 'Personal Details' : 
                   nextRequired === 'residence' ? 'Address Details' :
                   nextRequired === 'emergency' ? 'Emergency Contact' : 'Guardian Details'}`);
            setCurrentPage('profile');
            setActiveTab(nextRequired || 'personal');
            return;
        }
        if (!hasAllDocuments(documents)) {
            alert('Please upload all required Personal Documents (CNIC Front, CNIC Back, Domicile, Photograph) first.');
            setCurrentPage('personal-docs');
            return;
        }
        if (!hasAcademicRecords(academicRecords)) {
            alert('Please add your Academic Information (Matric, Intermediate, etc.) first.');
            setCurrentPage('academic-info');
            return;
        }
        setCurrentPage('application-form');
    };

    const tabLabels = {
        personal: 'PERSONAL DETAILS',
        residence: 'ADDRESS DETAILS',
        emergency: 'EMERGENCY CONTACT',
        guardian: 'GUARDIAN DETAILS',
    };

    const renderActiveTab = () => {
        const tabProps = { readOnly: isLocked };
        switch (activeTab) {
            case 'personal':  
                return <PersonalDetailsTab profileData={profileData} updateProfile={handleProfileChange} {...tabProps} />;
            case 'residence': 
                return <ResidenceDetailsTab profileData={profileData} updateProfile={handleNestedProfileChange} {...tabProps} />;
            case 'emergency': 
                return <EmergencyContactTab profileData={profileData} updateProfile={handleNestedProfileChange} {...tabProps} />;
            case 'guardian':  
                return <GuardianDetailsTab profileData={profileData} updateProfile={handleNestedProfileChange} {...tabProps} />;
            default:          
                return <PersonalDetailsTab profileData={profileData} updateProfile={handleProfileChange} {...tabProps} />;
        }
    };

    const getTabStatus = (tabName) => {
        switch(tabName) {
            case 'personal': return isPersonalDetailsComplete(profileData);
            case 'residence': return isResidenceDetailsComplete(profileData);
            case 'emergency': return isEmergencyContactComplete(profileData);
            case 'guardian': return isGuardianDetailsComplete(profileData);
            default: return false;
        }
    };

    if (loading) {
        return (
            <div className="dashboard-layout">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading your profile...</p>
                </div>
            </div>
        );
    }

    if (isRejected) {
        return (
            <RejectedApplicationView
                username={studentInfo.username}
                onLogout={handleLogout}
            />
        );
    }

    return (
        <div className="dashboard-layout fade-in">
            <aside className="dashboard-sidebar">
                <div className="sidebar-user-card compact-card">
                    <img 
                        src={profileData.profileImage || "/student-avatar.jpg"} 
                        alt="Student" 
                        className="sidebar-avatar-compact" 
                        onError={(e) => { 
                            e.target.src = `https://ui-avatars.com/api/?name=${studentInfo.username}&background=3B5BDB&color=fff`; 
                        }} 
                    />
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-id-compact">{studentInfo.username}</div>
                        <div className="sidebar-user-role-compact">Student Applicant</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <a 
                        className={`sidebar-link ${currentPage === 'home' ? 'active' : ''}`} 
                        onClick={() => setCurrentPage('home')} 
                        style={{ cursor: 'pointer' }}
                    >
                        <span className="sidebar-link-icon"><LayoutDashboardIcon /></span>
                        Dashboard
                    </a>
                    <a 
                        className={`sidebar-link ${currentPage === 'profile' ? 'active' : ''}`} 
                        onClick={() => setCurrentPage('profile')} 
                        style={{ cursor: 'pointer' }}
                    >
                        <span className="sidebar-link-icon"><UserIcon /></span>
                        Complete Profile
                    </a>
                    <a 
                        className={`sidebar-link dropdown-link ${['personal-docs','academic-info','add-academic', 'application-list', 'application-form'].includes(currentPage) ? 'active' : ''}`} 
                        onClick={() => setAdmissionOpen(!admissionOpen)} 
                        style={{ cursor: 'pointer' }}
                    >
                        <span className="sidebar-link-icon"><FileTextIcon /></span>
                        <span className="sidebar-text-clamp">Admission Management</span>
                        <span className={`sidebar-link-arrow ${admissionOpen ? 'open' : ''}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </span>
                    </a>
                    {admissionOpen && (
                        <div className="sidebar-submenu">
                            <a 
                                className={`sidebar-sublink ${currentPage === 'personal-docs' ? 'active' : ''}`} 
                                onClick={navigateToPersonalDocuments}
                                style={{ cursor: isPersonalDetailsComplete(profileData) ? 'pointer' : 'not-allowed', opacity: isPersonalDetailsComplete(profileData) ? 1 : 0.5 }}
                            >
                                Personal Documents
                                {!isPersonalDetailsComplete(profileData) && <span style={{ marginLeft: '8px', fontSize: '10px' }}>🔒</span>}
                            </a>
                            <a 
                                className={`sidebar-sublink ${currentPage === 'academic-info' || currentPage === 'add-academic' ? 'active' : ''}`} 
                                onClick={navigateToAcademicInfo}
                                style={{ cursor: hasAllDocuments(documents) ? 'pointer' : 'not-allowed', opacity: hasAllDocuments(documents) ? 1 : 0.5 }}
                            >
                                Academic Information
                                {!hasAllDocuments(documents) && <span style={{ marginLeft: '8px', fontSize: '10px' }}>🔒</span>}
                            </a>
                            <a 
                                className={`sidebar-sublink ${currentPage === 'application-list' ? 'active' : ''}`} 
                                onClick={navigateToApplicationList}
                                style={{ cursor: isProfileComplete(profileData) && hasAllDocuments(documents) && hasAcademicRecords(academicRecords) ? 'pointer' : 'not-allowed', opacity: isProfileComplete(profileData) && hasAllDocuments(documents) && hasAcademicRecords(academicRecords) ? 1 : 0.5 }}
                            >
                                Application List
                                {(!isProfileComplete(profileData) || !hasAllDocuments(documents) || !hasAcademicRecords(academicRecords)) && <span style={{ marginLeft: '8px', fontSize: '10px' }}>🔒</span>}
                            </a>
                            <a 
                                className={`sidebar-sublink ${currentPage === 'application-form' ? 'active' : ''}`} 
                                onClick={navigateToNewApplication}
                                style={{ cursor: isLocked || !(isProfileComplete(profileData) && hasAllDocuments(documents) && hasAcademicRecords(academicRecords)) ? 'not-allowed' : 'pointer', opacity: isLocked || !(isProfileComplete(profileData) && hasAllDocuments(documents) && hasAcademicRecords(academicRecords)) ? 0.5 : 1, display: isLocked ? 'none' : undefined }}
                            >
                                New Application
                                {(!isProfileComplete(profileData) || !hasAllDocuments(documents) || !hasAcademicRecords(academicRecords)) && <span style={{ marginLeft: '8px', fontSize: '10px' }}>🔒</span>}
                            </a>
                        </div>
                    )}
                    <a 
                        className={`sidebar-link ${currentPage === 'change-password' ? 'active' : ''}`} 
                        onClick={() => setCurrentPage('change-password')} 
                        style={{ cursor: 'pointer' }}
                    >
                        <span className="sidebar-link-icon"><ShieldIcon /></span>
                        Change Password
                    </a>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="header-logo-icon" style={{ display: 'flex', alignItems: 'center' }}>
                        <img src="/campus360-logo.png" alt="Campus 360" style={{ height: '36px', objectFit: 'contain', borderRadius: '5px'}} />
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
                                src={profileData.profileImage || "/student-avatar.jpg"} 
                                alt={studentInfo.username} 
                                title={studentInfo.username} 
                                className="header-avatar" 
                                onError={(e) => { 
                                    e.target.src = `https://ui-avatars.com/api/?name=${studentInfo.username}&background=3B5BDB&color=fff`; 
                                }} 
                            />
                            <div className={`dropdown-menu ${profileOpen ? 'show' : ''}`}>
                                <a href="#" className="dropdown-item" onClick={(e) => { 
                                    e.preventDefault(); 
                                    setCurrentPage('profile'); 
                                    setProfileOpen(false); 
                                }}>
                                    <UserIcon /> Profile
                                </a>
                                <div className="dropdown-divider"></div>
                                <a href="#" onClick={handleLogout} className="dropdown-item text-danger">
                                    <LogOutIcon /> Logout
                                </a>
                            </div>
                        </div>
                        <button className="dropdown-arrow-btn" style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                    </div>
                </header>

                <div className="dashboard-content-wrapper">
                    {isLocked && (
                        <div style={{
                            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
                            padding: '14px 18px', marginBottom: '20px', color: '#1e40af',
                        }}>
                            <strong>Application Submitted</strong> — Your application is under review. You cannot make changes to your profile, documents, or academic records.
                        </div>
                    )}

                    {currentPage === 'home' && <DashboardHomePage onNavigate={(p) => setCurrentPage(p)} studentInfo={studentInfo} isLocked={isLocked} applications={applications} />}
                    
                    {currentPage === 'profile' && (
                        <>
                            <div className="page-header-minimal">
                                <div className="breadcrumb-minimal">DASHBOARD &nbsp;&gt;&nbsp; USER MANAGEMENT &nbsp;&gt;&nbsp; {tabLabels[activeTab]}</div>
                                <h1 className="page-title-minimal">Complete Profile</h1>
                            </div>
                            <div className="step-navigation">
                                <div 
                                    className={`step-item ${activeTab === 'personal' ? 'active' : ''} ${getTabStatus('personal') ? 'completed' : ''}`} 
                                    onClick={() => navigateToTab('personal')}
                                >
                                    <div className="step-icon-wrapper"><UserIcon /></div>
                                    <span className="step-label">Personal Details</span>
                                    {getTabStatus('personal') && <span className="step-check">✓</span>}
                                </div>
                                <div className="step-connector"></div>
                                <div 
                                    className={`step-item ${activeTab === 'residence' ? 'active' : ''} ${getTabStatus('residence') ? 'completed' : ''} ${!canAccessTab(profileData, 'residence') ? 'disabled' : ''}`} 
                                    onClick={() => navigateToTab('residence')}
                                    style={{ cursor: canAccessTab(profileData, 'residence') ? 'pointer' : 'not-allowed', opacity: canAccessTab(profileData, 'residence') ? 1 : 0.5 }}
                                >
                                    <div className="step-icon-wrapper"><MapPinIcon /></div>
                                    <span className="step-label">Address Details</span>
                                    {getTabStatus('residence') && <span className="step-check">✓</span>}
                                </div>
                                <div className="step-connector"></div>
                                <div 
                                    className={`step-item ${activeTab === 'emergency' ? 'active' : ''} ${getTabStatus('emergency') ? 'completed' : ''} ${!canAccessTab(profileData, 'emergency') ? 'disabled' : ''}`} 
                                    onClick={() => navigateToTab('emergency')}
                                    style={{ cursor: canAccessTab(profileData, 'emergency') ? 'pointer' : 'not-allowed', opacity: canAccessTab(profileData, 'emergency') ? 1 : 0.5 }}
                                >
                                    <div className="step-icon-wrapper"><PhoneIcon /></div>
                                    <span className="step-label">Emergency Contact</span>
                                    {getTabStatus('emergency') && <span className="step-check">✓</span>}
                                </div>
                                <div className="step-connector"></div>
                                <div 
                                    className={`step-item ${activeTab === 'guardian' ? 'active' : ''} ${getTabStatus('guardian') ? 'completed' : ''} ${!canAccessTab(profileData, 'guardian') ? 'disabled' : ''}`} 
                                    onClick={() => navigateToTab('guardian')}
                                    style={{ cursor: canAccessTab(profileData, 'guardian') ? 'pointer' : 'not-allowed', opacity: canAccessTab(profileData, 'guardian') ? 1 : 0.5 }}
                                >
                                    <div className="step-icon-wrapper"><ShieldIcon /></div>
                                    <span className="step-label">Guardian Details</span>
                                    {getTabStatus('guardian') && <span className="step-check">✓</span>}
                                </div>
                            </div>
                            {renderActiveTab()}
                        </>
                    )}
                    
                    {currentPage === 'personal-docs' && <PersonalDocumentsPage onDocumentChange={refreshDocuments} readOnly={isLocked} />}
                    {currentPage === 'academic-info' && (
                        <AcademicInformationPage 
                            onAddClick={() => setCurrentPage('add-academic')} 
                            onAcademicRecordChange={refreshAcademicRecords}
                            readOnly={isLocked}
                        />
                    )}
                    {currentPage === 'add-academic' && <AddAcademicInfoPage onCancel={() => setCurrentPage('academic-info')} />}
                    {currentPage === 'application-list' && <AdmissionListingPage onCreateNew={() => setCurrentPage('application-form')} readOnly={isLocked} />}
                    {currentPage === 'application-form' && (
                        <AdmissionFormPage
                            onCancel={() => setCurrentPage('application-list')}
                            onSubmitted={refreshApplications}
                        />
                    )}
                    {currentPage === 'change-password' && <ChangePasswordPage />}
                </div>

                <footer className="dashboard-footer">
                    <div>2026 &copy; Campus 360. All rights reserved.</div>
                    <div>Developed by Campus 360 Group</div>
                </footer>
            </main>
        </div>
    );
};

export default Dashboard;