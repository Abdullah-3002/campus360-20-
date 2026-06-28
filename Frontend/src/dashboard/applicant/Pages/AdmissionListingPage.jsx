// src/dashboard/Pages/AdmissionListingPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getMyApplications, getApplicantProfile, getMyDocuments } from '../../../services/admissionService';
import { CheckIcon, AlertCircleIcon, PlusIcon, FileTextIcon, TrashIcon } from '../../Icons';

const EyeIcon = ({ size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const AdmissionListingPage = ({ onCreateNew, readOnly = false }) => {
    const { token } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [checklistItems, setChecklistItems] = useState([
        { label: 'Personal Details', status: 'pending', key: 'personal' },
        { label: 'Residence Details', status: 'pending', key: 'residence' },
        { label: 'Emergency Contact', status: 'pending', key: 'emergency' },
        { label: 'Guardian Details', status: 'pending', key: 'guardian' },
        { label: 'Personal Documents (CNIC, Domicile, Photograph)', status: 'pending', key: 'documents' },
    ]);

    // Helper functions to check completion status
 // Helper functions to check completion status - FIXED
const isPersonalDetailsComplete = (profile) => {
    if (!profile) return false;
    
    // Handle both camelCase (frontend) and snake_case (backend)
    const firstName = profile.firstName || profile.first_name;
    const lastName = profile.lastName || profile.last_name;
    const fatherName = profile.fatherName || profile.father_name;
    const cnic = profile.cnic;
    const gender = profile.gender;
    const cellPhone = profile.cellPhone || profile.phone;
    const email = profile.email;
    
    const requiredFields = [firstName, lastName, fatherName, cnic, gender, cellPhone];
    return requiredFields.every(field => field && field.toString().trim() !== '');
};

const isResidenceDetailsComplete = (profile) => {
    if (!profile) return false;
    
    // Try nested object first, then flat structure
    let perm_country = profile.residence?.perm_country || profile.perm_country;
    let perm_state = profile.residence?.perm_state || profile.perm_state;
    let perm_city = profile.residence?.perm_city || profile.perm_city;
    let perm_address = profile.residence?.perm_address || profile.perm_address;
    
    return !!(perm_country && perm_country.toString().trim() !== '' &&
              perm_state && perm_state.toString().trim() !== '' &&
              perm_city && perm_city.toString().trim() !== '' &&
              perm_address && perm_address.toString().trim() !== '');
};

const isEmergencyContactComplete = (profile) => {
    if (!profile) return false;
    
    // Try nested object first, then flat structure
    let name = profile.emergency?.name || profile.emergency_name;
    let relation = profile.emergency?.relation || profile.emergency_relation;
    let phone = profile.emergency?.phone || profile.emergency_phone;
    
    return !!(name && name.toString().trim() !== '' &&
              relation && relation.toString().trim() !== '' &&
              phone && phone.toString().trim() !== '');
};

const isGuardianDetailsComplete = (profile) => {
    if (!profile) return false;
    
    // Try nested object first, then flat structure
    let name = profile.guardian?.name || profile.guardian_name;
    let cnic = profile.guardian?.cnic || profile.guardian_cnic;
    let relation = profile.guardian?.relation || profile.guardian_relation;
    
    return !!(name && name.toString().trim() !== '' &&
              cnic && cnic.toString().trim() !== '' &&
              relation && relation.toString().trim() !== '');
};

const arePersonalDocumentsComplete = (documents) => {
    const requiredDocuments = ['cnic_front', 'cnic_back', 'domicile', 'photograph'];
    const uploadedTypes = documents.map(doc => doc.document_type);
    return requiredDocuments.every(type => uploadedTypes.includes(type));
};

const loadChecklistStatus = async () => {
    try {
        // Fetch profile data
        const profile = await getApplicantProfile(token);
        console.log('Raw profile data:', profile); // Debug log
        
        // IMPROVED: Check if profile has ANY data instead of looking for firstName
        const hasPersonalData = profile && (
            profile.firstName || profile.first_name || 
            profile.lastName || profile.last_name || 
            profile.cnic
        );
        
        if (!profile || !hasPersonalData) {
            console.log('No profile data found');
            const pendingChecklist = [
                { label: 'Personal Details', status: 'pending', key: 'personal' },
                { label: 'Residence Details', status: 'pending', key: 'residence' },
                { label: 'Emergency Contact', status: 'pending', key: 'emergency' },
                { label: 'Guardian Details', status: 'pending', key: 'guardian' },
                { label: 'Personal Documents (CNIC, Domicile, Photograph)', status: 'pending', key: 'documents' },
            ];
            setChecklistItems(pendingChecklist);
            return;
        }
        
        // Fetch documents data
        const docs = await getMyDocuments(token);
        const docsArray = Array.isArray(docs) ? docs : (docs?.results || []);
        console.log('Documents:', docsArray); // Debug log
        
        // Update checklist status
        const updatedChecklist = [
            { 
                label: 'Personal Details', 
                status: isPersonalDetailsComplete(profile) ? 'completed' : 'pending', 
                key: 'personal' 
            },
            { 
                label: 'Residence Details', 
                status: isResidenceDetailsComplete(profile) ? 'completed' : 'pending', 
                key: 'residence' 
            },
            { 
                label: 'Emergency Contact', 
                status: isEmergencyContactComplete(profile) ? 'completed' : 'pending', 
                key: 'emergency' 
            },
            { 
                label: 'Guardian Details', 
                status: isGuardianDetailsComplete(profile) ? 'completed' : 'pending', 
                key: 'guardian' 
            },
            { 
                label: 'Personal Documents (CNIC, Domicile, Photograph)', 
                status: arePersonalDocumentsComplete(docsArray) ? 'completed' : 'pending', 
                key: 'documents' 
            },
        ];
        
        console.log('Checklist status:', updatedChecklist); // Debug log
        setChecklistItems(updatedChecklist);
        
        // Calculate overall completion percentage
        const completedCount = updatedChecklist.filter(item => item.status === 'completed').length;
        const totalCount = updatedChecklist.length;
        const completionPercentage = (completedCount / totalCount) * 100;
        
        localStorage.setItem('profileCompletionPercentage', completionPercentage);
        
    } catch (error) {
        console.error('Failed to load checklist status:', error);
        // Set all as pending on error
        const pendingChecklist = [
            { label: 'Personal Details', status: 'pending', key: 'personal' },
            { label: 'Residence Details', status: 'pending', key: 'residence' },
            { label: 'Emergency Contact', status: 'pending', key: 'emergency' },
            { label: 'Guardian Details', status: 'pending', key: 'guardian' },
            { label: 'Personal Documents (CNIC, Domicile, Photograph)', status: 'pending', key: 'documents' },
        ];
        setChecklistItems(pendingChecklist);
    }
};

    const loadApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching applications...');
            const data = await getMyApplications(token);
            console.log('Applications data:', data);
            
            const appsArray = Array.isArray(data) ? data : (data?.results || []);
            setApplications(appsArray);
            
            if (appsArray.length === 0) {
                console.log('No applications found');
            }
        } catch (error) {
            console.error('Failed to load applications:', error);
            setError(error.response?.data?.message || error.message || 'Failed to load applications');
            setApplications([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            loadApplications();
            loadChecklistStatus();
        }
    }, [token]);

// src/dashboard/Pages/AdmissionListingPage.jsx - Updated deleteApplication function

const deleteApplication = async (appId, appNumber) => {
    if (!confirm(`Are you sure you want to delete application ${appNumber}? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:8000/api/admissions/application/${appId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('Application deleted successfully!');
            // Refresh both applications and checklist status
            await loadApplications();
            await loadChecklistStatus();
        } else {
            const errorData = await response.json();
            alert(errorData.error || 'Failed to delete application');
        }
    } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete application. Please try again.');
    }
};

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'status-badge approved';
            case 'rejected':
                return 'status-badge rejected';
            case 'under_review':
                return 'status-badge under-review';
            default:
                return 'status-badge pending';
        }
    };

    const getStatusText = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'APPROVED';
            case 'rejected':
                return 'REJECTED';
            case 'under_review':
                return 'UNDER REVIEW';
            default:
                return 'PENDING';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-PK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Calculate how many items are completed
    const completedCount = checklistItems.filter(item => item.status === 'completed').length;
    const totalCount = checklistItems.length;

    if (loading) {
        return (
            <div className="page-container fade-in">
                <div className="loading-spinner">Loading applications...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container fade-in">
                <div className="error-message" style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Error loading applications: {error}</p>
                    <button className="btn-verify" onClick={loadApplications}>Try Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container fade-in">
            <div className="page-header-minimal">
                <div className="breadcrumb-minimal">DASHBOARD &gt; ADMISSION MANAGEMENT &gt; APPLICATIONS</div>
                <h1 className="page-title-minimal">Admission Management</h1>
            </div>

            {/* Checklist Section */}
            <div className="form-card">
                <div className="section-header">
                    <div className="section-header-icon"><CheckIcon /></div>
                    <h2 className="section-title">
                        Profile Completion Checklist 
                        <span style={{ fontSize: '0.8rem', marginLeft: '10px', color: '#64748b' }}>
                            ({completedCount}/{totalCount} completed)
                        </span>
                    </h2>
                </div>
                <div className="checklist-grid">
                    {checklistItems.map((item, i) => (
                        <div key={i} className={`checklist-item ${item.status}`}>
                            <div className="checklist-icon">
                                {item.status === 'completed' ? <CheckIcon /> : <AlertCircleIcon />}
                            </div>
                            <span className="checklist-label">{item.label}</span>
                            <span className="checklist-status-text">{item.status.toUpperCase()}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Applications Table */}
            <div className="form-card">
                <div className="table-toolbar">
                    <h2 className="section-title" style={{ margin: 0 }}>My Applications</h2>
                    <button 
                        className="btn-add" 
                        onClick={onCreateNew} 
                        disabled={applications.length > 0 || readOnly}
                        style={readOnly ? { display: 'none' } : undefined}
                        title={applications.length > 0 ? "You can only create one application" : "Create new admission application"}
                    >
                        <PlusIcon /> <span>Create New Application</span>
                        {applications.length > 0 && <span style={{ fontSize: '12px', marginLeft: '8px' }}>(Only one allowed)</span>}
                        {completedCount !== totalCount && <span style={{ fontSize: '12px', marginLeft: '8px' }}>(Complete profile first)</span>}
                    </button>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Sr#</th>
                                <th>App No</th>
                                <th>App Type</th>
                                <th>Submission Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="empty-row">
                                        <FileTextIcon />
                                        <p>No application found</p>
                                        <span>Click "Create New Application" to start your admission journey.</span>
                                    </td>
                                </tr>
                            ) : (
                                applications.map((app, index) => (
                                    <tr key={app.id}>
                                        <td>{index + 1}</td>
                                        <td><span className="app-number">{app.application_number}</span></td>
                                        <td><span className="app-type-badge">{app.admission_type || 'Regular'}</span></td>
                                        <td>{formatDate(app.submitted_at)}</td>
                                        <td>
                                            <span className={getStatusBadgeClass(app.status)}>
                                                {getStatusText(app.status)}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    className="action-btn view-btn"
                                                    onClick={() => alert(`Application: ${app.application_number}\nStatus: ${app.status}\nType: ${app.admission_type}`)}
                                                    title="View Details"
                                                >
                                                    <EyeIcon size={16} />
                                                </button>
                                                {!readOnly && (
                                                <button 
                                                    className="action-btn danger"
                                                    onClick={() => deleteApplication(app.id, app.application_number)}
                                                    title="Delete Application"
                                                >
                                                    <TrashIcon size={16} />
                                                </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {applications.length > 0 && (
                    <div className="table-pagination">
                        <span className="pagination-info">
                            Showing {applications.length} of {applications.length} entries
                        </span>
                        <div className="pagination-controls">
                            <button className="pagination-btn" disabled>Previous</button>
                            <button className="pagination-btn active">1</button>
                            <button className="pagination-btn" disabled>Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdmissionListingPage;