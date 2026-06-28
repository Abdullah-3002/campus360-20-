import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader, useToast } from '../../shared/helpers';
import { ShieldIcon, UserIcon, LockIcon, MailIcon, PhoneIcon } from '../../Icons';

const CredentialsPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        user_type: 'teacher',
        employment_type: 'permanent',
        status: 'active',
        cnic: '',
        date_of_birth: '',
        gender: 'Male',
        phone_number: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relation: 'Parent',
        current_address: '',
        permanent_address: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.username || !formData.email || !formData.password) {
            alert('Username, Email, and Password are required.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await axios.post('http://localhost:8000/api/accounts/admin/create-credentials/', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast(res.data.message || 'Credentials created successfully!');
            setFormData({
                username: '', email: '', password: '', user_type: 'teacher', employment_type: 'permanent', status: 'active',
                cnic: '', date_of_birth: '', gender: 'Male', phone_number: '', emergency_contact_name: '', emergency_contact_phone: '',
                emergency_contact_relation: 'Parent', current_address: '', permanent_address: ''
            });
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create credentials');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > CREDENTIALS" title="Create Credentials & Staff Profiles" />

            <div className="form-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit}>
                    <div className="section-header">
                        <div className="section-header-icon"><ShieldIcon /></div>
                        <h3 className="section-title">User Account & Role Selection</h3>
                    </div>

                    <div className="two-column-grid" style={{ marginBottom: '24px' }}>
                        <div className="field-group">
                            <label className="field-label">Username <span className="required">*</span></label>
                            <input type="text" name="username" className="field-input" value={formData.username} onChange={handleChange} required placeholder="e.g. prof_john" />
                        </div>

                        <div className="field-group">
                            <label className="field-label">Email Address <span className="required">*</span></label>
                            <input type="email" name="email" className="field-input" value={formData.email} onChange={handleChange} required placeholder="e.g. john@university.edu" />
                        </div>

                        <div className="field-group">
                            <label className="field-label">Password <span className="required">*</span></label>
                            <input type="password" name="password" className="field-input" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
                        </div>

                        <div className="field-group">
                            <label className="field-label">User Role / Type <span className="required">*</span></label>
                            <select name="user_type" className="field-input field-select" value={formData.user_type} onChange={handleChange}>
                                <option value="teacher">Teacher (Faculty)</option>
                                <option value="staff">Staff Member</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                    </div>

                    {formData.user_type !== 'admin' && (
                        <>
                            <div className="section-header" style={{ marginTop: '20px' }}>
                                <div className="section-header-icon"><UserIcon /></div>
                                <h3 className="section-title">Employment & Staff Profile Details</h3>
                            </div>

                            <div className="two-column-grid" style={{ marginBottom: '24px' }}>
                                <div className="field-group">
                                    <label className="field-label">Employment Type</label>
                                    <select name="employment_type" className="field-input field-select" value={formData.employment_type} onChange={handleChange}>
                                        <option value="permanent">Permanent</option>
                                        <option value="visiting">Visiting</option>
                                        <option value="contractual">Contractual</option>
                                        <option value="temporary">Temporary</option>
                                    </select>
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Employment Status</label>
                                    <select name="status" className="field-input field-select" value={formData.status} onChange={handleChange}>
                                        <option value="active">Active</option>
                                        <option value="on_leave">On Leave</option>
                                        <option value="resigned">Resigned</option>
                                        <option value="retired">Retired</option>
                                    </select>
                                </div>

                                <div className="field-group">
                                    <label className="field-label">CNIC Number</label>
                                    <input type="text" name="cnic" className="field-input" placeholder="13 digits" value={formData.cnic} onChange={handleChange} />
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Date of Birth</label>
                                    <input type="date" name="date_of_birth" className="field-input" value={formData.date_of_birth} onChange={handleChange} />
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Gender</label>
                                    <select name="gender" className="field-input field-select" value={formData.gender} onChange={handleChange}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Phone Number (11 digits)</label>
                                    <input type="text" name="phone_number" className="field-input" placeholder="03001234567" value={formData.phone_number} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="section-header" style={{ marginTop: '20px' }}>
                                <div className="section-header-icon"><PhoneIcon /></div>
                                <h3 className="section-title">Emergency Contact & Address</h3>
                            </div>

                            <div className="two-column-grid" style={{ marginBottom: '24px' }}>
                                <div className="field-group">
                                    <label className="field-label">Emergency Contact Name</label>
                                    <input type="text" name="emergency_contact_name" className="field-input" value={formData.emergency_contact_name} onChange={handleChange} />
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Emergency Contact Phone</label>
                                    <input type="text" name="emergency_contact_phone" className="field-input" value={formData.emergency_contact_phone} onChange={handleChange} />
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Emergency Contact Relation</label>
                                    <input type="text" name="emergency_contact_relation" className="field-input" value={formData.emergency_contact_relation} onChange={handleChange} />
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Current Address</label>
                                    <input type="text" name="current_address" className="field-input" value={formData.current_address} onChange={handleChange} />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-actions">
                        <button type="submit" className="btn-save" disabled={submitting}>
                            {submitting ? 'Creating Credentials...' : 'Create Credentials & Create Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CredentialsPage;
