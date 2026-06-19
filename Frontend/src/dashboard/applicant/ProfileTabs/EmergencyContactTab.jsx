// src/dashboard/applicant/ProfileTabs/EmergencyContactTab.jsx
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { saveApplicantProfile, prepareProfileForBackend } from '../../../services/admissionService';
import { UserIcon, PhoneIcon } from '../../Icons';
import { getNameError, getPhoneError } from '../../../utils/validation';

const EmergencyContactTab = ({ profileData, updateProfile }) => {
    const { token } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const emergencyData = profileData.emergency || {};

    const validateField = (key, value) => {
        switch (key) {
            case 'name':
                return getNameError(value, 'Emergency contact name');
            case 'relation':
                if (!value) return 'Relation is required';
                return '';
            case 'phone':
                return getPhoneError(value);
            default:
                return '';
        }
    };

    const handleFieldChange = (key, val) => {
        updateProfile('emergency', key, val);
        const error = validateField(key, val);
        setErrors(prev => ({ ...prev, [key]: error }));
    };

    const handleBlur = (key) => {
        setTouched(prev => ({ ...prev, [key]: true }));
        const error = validateField(key, emergencyData[key]);
        setErrors(prev => ({ ...prev, [key]: error }));
    };

    const getFieldStatus = (key) => {
        if (!touched[key]) return null;
        if (errors[key]) return 'error';
        if (emergencyData[key]) return 'success';
        return null;
    };

    const getInputClass = (key) => {
        const status = getFieldStatus(key);
        if (status === 'error') return 'field-input error';
        if (status === 'success') return 'field-input success';
        return 'field-input';
    };

    const getSelectClass = (key) => {
        const status = getFieldStatus(key);
        if (status === 'error') return 'field-input field-select error';
        if (status === 'success') return 'field-input field-select success';
        return 'field-input field-select';
    };

    const handlePhoneChange = (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
        handleFieldChange('phone', val);
    };

    const validateForm = () => {
        const newErrors = {
            name: validateField('name', emergencyData.name),
            relation: validateField('relation', emergencyData.relation),
            phone: validateField('phone', emergencyData.phone),
        };
        
        setErrors(newErrors);
        setTouched({ name: true, relation: true, phone: true });
        
        return Object.keys(newErrors).every(key => !newErrors[key]);
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            alert('Please fix the errors in the form');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = prepareProfileForBackend(profileData);
            await saveApplicantProfile(payload, token);
            alert('Emergency contact saved to database successfully!');
        } catch (error) {
            console.error('Failed to save emergency contact:', error);
            alert('Failed to save: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="tab-content-area fade-in">
            <div className="form-card">
                <div className="section-header">
                    <div className="section-header-icon"><UserIcon /></div>
                    <h2 className="section-title">Emergency Contact Information</h2>
                </div>

                <div className="info-banner compact">
                    <span>🚨</span>
                    <span>This contact will be used in case of emergencies. Please provide accurate information.</span>
                </div>

                <div className="two-column-grid">
                    <div className="field-group">
                        <label className="field-label">Contact Name <span className="required">*</span></label>
                        <input 
                            type="text" 
                            name="emergencyName"
                            className={getInputClass('name')}
                            placeholder="Full Name" 
                            value={emergencyData.name || ''} 
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            onBlur={() => handleBlur('name')}
                        />
                        {touched.name && errors.name && (
                            <div className="error-message">{errors.name}</div>
                        )}
                    </div>

                    <div className="field-group">
                        <label className="field-label">Relation <span className="required">*</span></label>
                        <select 
                            name="emergencyRelation"
                            className={getSelectClass('relation')}
                            value={emergencyData.relation || ''} 
                            onChange={(e) => handleFieldChange('relation', e.target.value)}
                            onBlur={() => handleBlur('relation')}
                        >
                            <option value="">Select Relation</option>
                            <option value="father">Father</option>
                            <option value="mother">Mother</option>
                            <option value="brother">Brother</option>
                            <option value="sister">Sister</option>
                            <option value="spouse">Spouse</option>
                            <option value="uncle">Uncle</option>
                            <option value="aunt">Aunt</option>
                            <option value="cousin">Cousin</option>
                            <option value="friend">Friend</option>
                            <option value="other">Other</option>
                        </select>
                        {touched.relation && errors.relation && (
                            <div className="error-message">{errors.relation}</div>
                        )}
                    </div>
                </div>

                <div className="field-group">
                    <label className="field-label">Phone Number <span className="required">*</span></label>
                    <div className="input-wrapper">
                        <div className="phone-prefix">+92</div>
                        <input 
                            type="tel" 
                            name="emergencyPhone"
                            className={`${getInputClass('phone')} phone-input`}
                            placeholder="3001234567" 
                            value={emergencyData.phone || ''} 
                            onChange={handlePhoneChange}
                            onBlur={() => handleBlur('phone')}
                        />
                    </div>
                    {touched.phone && errors.phone && (
                        <div className="error-message">{errors.phone}</div>
                    )}
                    <p className="helper-text">Enter 10-digit phone number after +92 (e.g., 3001234567)</p>
                </div>
            </div>

            <div className="form-actions">
                <button className="btn-save" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Submit Details'}
                </button>
            </div>
        </div>
    );
};

export default EmergencyContactTab;