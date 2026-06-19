// src/dashboard/Pages/AdmissionFormPage.jsx - Updated version

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext'; 
import { submitApplication, getMyApplications } from '../../../services/admissionService';
import { PlusIcon, TrashIcon, XIcon, CheckIcon, SparklesIcon, ArrowRightIcon, InfoIcon } from '../../Icons';

const AdmissionFormPage = ({ onCancel, editApplicationId = null, hasExistingApp = false }) => {
    const [activeTab, setActiveTab] = useState('detail');
    const [appType, setAppType] = useState('Regular');
    const [preferences, setPreferences] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [pendingPref, setPendingPref] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const { token } = useAuth();

    const [formData, setFormData] = useState({
        program: '',
        preference: ''
    });

    // Available programs list
    const availablePrograms = [
        { id: 1, name: "BS Computer Science", department: "Faculty of Computing & Information Technology" },
        { id: 2, name: "BS Software Engineering", department: "Faculty of Computing & Information Technology" },
        { id: 3, name: "BS Information Technology", department: "Faculty of Computing & Information Technology" },
        { id: 4, name: "BS Data Science", department: "Faculty of Computing & Information Technology" },
        { id: 5, name: "BS Artificial Intelligence", department: "Faculty of Computing & Information Technology" },
        { id: 6, name: "BS Cyber Security", department: "Faculty of Computing & Information Technology" },
        { id: 7, name: "BS Business Administration", department: "Faculty of Business & Management Sciences" },
        { id: 8, name: "BS Accounting & Finance", department: "Faculty of Business & Management Sciences" },
        { id: 9, name: "BS Media Studies", department: "Faculty of Arts & Social Sciences" },
        { id: 10, name: "BS Psychology", department: "Faculty of Arts & Social Sciences" },
        { id: 11, name: "BS English", department: "Faculty of Arts & Social Sciences" },
        { id: 12, name: "BS Economics", department: "Faculty of Arts & Social Sciences" },
    ];

    // REMOVED: The auto-check for existing application that shows alert
    // The check is now done in Dashboard.jsx before navigating here

    // Load existing application data if editing
    useEffect(() => {
        if (editApplicationId) {
            loadApplicationData();
        }
    }, [editApplicationId]);

    const loadApplicationData = async () => {
        setLoading(true);
        try {
            const applications = await getMyApplications(token);
            const application = applications.find(app => app.id === editApplicationId);
            if (application) {
                setAppType(application.admission_type || 'Regular');
                if (application.preferences) {
                    const loadedPrefs = application.preferences.map((pref, index) => ({
                        id: pref.id || Date.now() + index,
                        sr: index + 1,
                        program: pref.program,
                        preference: pref.preference_order,
                        department: pref.department
                    }));
                    setPreferences(loadedPrefs);
                }
            }
        } catch (error) {
            console.error('Failed to load application:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDepartment = (programName) => {
        const program = availablePrograms.find(p => p.name === programName);
        return program ? program.department : 'Faculty of Computing & Information Technology';
    };

    const isPreferenceExists = (program, preference) => {
        return preferences.some(p => p.program === program || p.preference === preference);
    };

    const handleAddClick = () => {
        if (!formData.program) {
            alert('Please select a program');
            return;
        }
        if (!formData.preference) {
            alert('Please select a preference');
            return;
        }
        
        if (isPreferenceExists(null, formData.preference)) {
            alert(`Preference ${formData.preference} has already been added. Please choose a different preference.`);
            return;
        }
        
        if (isPreferenceExists(formData.program, null)) {
            alert('This program has already been added. Please choose a different program.');
            return;
        }

        setPendingPref({
            program: formData.program,
            preference: formData.preference,
            department: getDepartment(formData.program)
        });
        setShowModal(true);
    };

    const confirmPreference = () => {
        const newPreferences = [...preferences, { 
            id: Date.now(),
            sr: preferences.length + 1,
            program: pendingPref.program,
            preference: pendingPref.preference,
            department: pendingPref.department
        }];
        
        newPreferences.sort((a, b) => {
            const prefA = parseInt(a.preference);
            const prefB = parseInt(b.preference);
            return prefA - prefB;
        });
        
        newPreferences.forEach((pref, idx) => {
            pref.sr = idx + 1;
        });
        
        setPreferences(newPreferences);
        setShowModal(false);
        setFormData({ program: '', preference: '' });
        
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const removePreference = (id) => {
        const newPrefs = preferences
            .filter(p => p.id !== id)
            .map((p, i) => ({ ...p, sr: i + 1 }));
        setPreferences(newPrefs);
    };

    const validateForm = () => {
        const errors = {};
        
        if (preferences.length === 0) {
            errors.preferences = 'Please add at least one program preference';
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmitApplication = async () => {
        if (!validateForm()) {
            return;
        }
        
        if (preferences.length === 0) {
            alert('Please add at least one program preference before submitting.');
            return;
        }
        
        setSubmitting(true);
        
        try {
            const applicationData = {
                admission_type: appType,
                preferences: preferences.map(p => ({
                    program: p.program,
                    preference: p.preference,
                    department: p.department
                }))
            };
            
            const result = await submitApplication(applicationData, token);
            
            setShowSuccessModal(true);
            console.log('Application saved:', result.application_number);
            
            setTimeout(() => {
                setShowSuccessModal(false);
                onCancel();
            }, 3000);
            
        } catch (error) {
            console.error('Submission error:', error);
            const errorMsg = error.response?.data?.message || 
                            error.response?.data?.error || 
                            'Submission failed. Make sure your profile is saved first.';
            alert(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const getAvailablePreferences = () => {
        const usedPrefs = preferences.map(p => parseInt(p.preference));
        const allPrefs = [1, 2, 3];
        return allPrefs.filter(p => !usedPrefs.includes(p));
    };

    if (loading) {
        return (
            <div className="page-container fade-in">
                <div className="loading-spinner">Loading application data...</div>
            </div>
        );
    }

    return (
        <div className="page-container fade-in">
            <div className="page-header-minimal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div className="breadcrumb-minimal">DASHBOARD &gt; ADMISSION &gt; {editApplicationId ? 'EDIT APPLICATION' : 'NEW APPLICATION'}</div>
                    <h1 className="page-title-minimal">{editApplicationId ? 'Edit Application' : 'Create Application'}</h1>
                </div>
                <button className="btn-verify" onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowRightIcon /> Back to List
                </button>
            </div>

            {/* Internal Tabs */}
            <div className="application-tabs">
                <button 
                    className={`app-tab ${activeTab === 'detail' ? 'active' : ''}`}
                    onClick={() => setActiveTab('detail')}
                >
                    Application Detail
                </button>
                <button 
                    className={`app-tab ${activeTab === 'preferences' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preferences')}
                >
                    Program Preferences {preferences.length > 0 && `(${preferences.length})`}
                </button>
            </div>

            {/* Tab: Detail */}
            {activeTab === 'detail' && (
                <div className="form-card fade-in">
                    <div className="info-banner" style={{ marginBottom: '20px' }}>
                        <InfoIcon />
                        <div>
                            <strong>Important:</strong> Please review your application details before proceeding to program preferences.
                        </div>
                    </div>
                    
                    <div className="two-column-grid">
                        <div className="field-group">
                            <label className="field-label">Application Number</label>
                            <input 
                                type="text" 
                                className="field-input" 
                                value={`APP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`} 
                                readOnly 
                                style={{ background: '#f8fafc', color: '#64748b' }} 
                            />
                        </div>
                        <div className="field-group">
                            <label className="field-label">Application Date</label>
                            <input 
                                type="text" 
                                className="field-input" 
                                value={new Date().toLocaleDateString()} 
                                readOnly 
                                style={{ background: '#f8fafc', color: '#64748b' }} 
                            />
                        </div>
                    </div>
                    
                    <div className="field-group">
                        <label className="field-label">Admission Type <span className="required">*</span></label>
                        <select 
                            className="field-input field-select" 
                            value={appType} 
                            onChange={(e) => setAppType(e.target.value)}
                        >
                            <option value="Regular">Regular (Semester 1)</option>
                            <option value="Lateral">Lateral (Semester 5)</option>
                            <option value="Migration">Migration</option>
                        </select>
                    </div>
                    
                    <div className="info-banner compact" style={{ marginTop: '20px', background: '#fef3c7', borderColor: '#f59e0b' }}>
                        <InfoIcon />
                        <span>You can add program preferences in the next tab. Please add at least one preference.</span>
                    </div>
                    
                    <div className="form-actions" style={{ marginTop: '20px' }}>
                        <button className="btn-update" onClick={() => setActiveTab('preferences')}>
                            Continue to Preferences
                        </button>
                    </div>
                </div>
            )}

            {/* Tab: Preferences */}
            {activeTab === 'preferences' && (
                <div className="form-card fade-in">
                    <div className="two-column-grid">
                        <div className="field-group">
                            <label className="field-label">Pick a Program <span className="required">*</span></label>
                            <select 
                                className="field-input field-select" 
                                value={formData.program}
                                onChange={(e) => setFormData({...formData, program: e.target.value})}
                            >
                                <option value="">Select Program</option>
                                {availablePrograms.map(program => (
                                    <option key={program.id} value={program.name}>
                                        {program.name} ({program.department})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="field-group">
                            <label className="field-label">Pick a Preference <span className="required">*</span></label>
                            <select 
                                className="field-input field-select"
                                value={formData.preference}
                                onChange={(e) => setFormData({...formData, preference: e.target.value})}
                            >
                                <option value="">Select Preference</option>
                                {getAvailablePreferences().map(pref => (
                                    <option key={pref} value={`${pref}${pref === 1 ? 'st' : pref === 2 ? 'nd' : 'rd'} Preference`}>
                                        {pref}{pref === 1 ? 'st' : pref === 2 ? 'nd' : 'rd'} Preference
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div style={{ marginBottom: '25px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button 
                            className="btn-add" 
                            disabled={!formData.program || !formData.preference || submitting}
                            onClick={handleAddClick}
                        >
                            <PlusIcon /> <span>ADD PREFERENCE</span>
                        </button>
                        <button 
                            className="btn-ai-recommend"
                            onClick={() => alert("AI Recommendation feature is coming soon! Based on your academic profile, we'll suggest the best programs for you.")}
                            title="Get AI-powered degree suggestions based on your profile"
                        >
                            <SparklesIcon size={16} /> <span>AI Degree Recommendation</span>
                        </button>
                    </div>
                    
                    {formErrors.preferences && (
                        <div className="error-message" style={{ color: 'red', marginBottom: '15px', padding: '10px', background: '#fee2e2', borderRadius: '8px' }}>
                            {formErrors.preferences}
                        </div>
                    )}

                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Sr#</th>
                                    <th>Department</th>
                                    <th>Program</th>
                                    <th>Preference</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preferences.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="empty-row">
                                            No preference added. Please add at least one program preference.
                                        </td>
                                    </tr>
                                ) : (
                                    preferences.map((p) => (
                                        <tr key={p.id}>
                                             <td>{p.sr}</td>
                                             <td>{p.department}</td>
                                             <td><strong>{p.program}</strong></td>
                                             <td><span className="pref-badge">{p.preference}</span></td>
                                             <td>
                                                <button 
                                                    className="action-btn danger" 
                                                    onClick={() => removePreference(p.id)}
                                                    disabled={submitting}
                                                >
                                                    <TrashIcon />
                                                </button>
                                             </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {preferences.length > 0 && (
                        <div className="info-banner compact" style={{ marginTop: '20px', background: '#dbeafe', borderColor: '#3b82f6' }}>
                            <CheckIcon />
                            <span>You have added {preferences.length} preference(s). Higher preference numbers indicate higher priority.</span>
                        </div>
                    )}
                    
                    <div className="form-actions" style={{ marginTop: '20px' }}>
                        <button 
                            className="btn-save" 
                            disabled={preferences.length === 0 || submitting}
                            onClick={handleSubmitApplication}
                        >
                            {submitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showToast && (
                <div className="toast success fade-in-up">
                    <CheckIcon />
                    <span>Program preference added successfully!</span>
                </div>
            )}

            {/* Preference Confirmation Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-modal fade-up">
                        <div className="modal-header">
                            <h3>Confirm Program Selection</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <XIcon />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-info-item">
                                <label>Department:</label>
                                <span>{pendingPref?.department}</span>
                            </div>
                            <div className="modal-info-item">
                                <label>Selected Program:</label>
                                <span className="highlight-text">{pendingPref?.program}</span>
                            </div>
                            <div className="modal-info-item">
                                <label>Preference Order:</label>
                                <span className="highlight-text">{pendingPref?.preference}</span>
                            </div>
                            <p className="modal-note">
                                Please confirm your selection. Added preferences will be considered during the admission processing.
                                You can reorder preferences by removing and re-adding them.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={confirmPreference}>
                                Save Preference
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Submission Modal */}
            {showSuccessModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-modal fade-up" style={{ textAlign: 'center', padding: '40px' }}>
                        <div className="success-icon-large fade-in">
                            <CheckIcon size={48} />
                        </div>
                        <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Application Submitted!</h2>
                        <p style={{ color: '#64748b', marginBottom: '15px' }}>
                            Your admission application has been successfully submitted for processing.
                        </p>
                        <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '14px' }}>
                            You can track your application status in the application list.
                        </p>
                        <button className="btn-primary" onClick={onCancel} style={{ width: '100%' }}>
                            View My Applications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdmissionFormPage;