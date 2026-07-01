import React, { useState, useEffect } from 'react';
import { apiPost } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { listDepartments, listPrograms } from '../../../services/academicsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useToast } from '../../shared/helpers';
import { ShieldIcon, MailIcon, LockIcon } from '../../Icons';

const CredentialsPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [programs, setPrograms] = useState([]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        user_type: 'teacher',
        department_id: '',
        program_id: '',
    });

    useEffect(() => {
        if (!token) return;
        listDepartments(token).then(d => setDepartments(normalizeList(d))).catch(console.error);
    }, [token]);

    useEffect(() => {
        if (!token || !formData.department_id) { setPrograms([]); return; }
        listPrograms(token, formData.department_id).then(d => setPrograms(normalizeList(d))).catch(console.error);
    }, [token, formData.department_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'department_id') next.program_id = '';
            if (name === 'user_type' && value === 'admin') {
                next.department_id = '';
                next.program_id = '';
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            alert('Email and Password are required.');
            return;
        }
        if (formData.user_type === 'teacher' && (!formData.department_id || !formData.program_id)) {
            alert('Department and Program are required for teachers.');
            return;
        }
        setSubmitting(true);
        try {
            const username = formData.email.split('@')[0];
            const res = await apiPost('/admin/create-credentials/', {
                username,
                email: formData.email,
                password: formData.password,
                user_type: formData.user_type,
                department_id: formData.department_id || undefined,
                program_id: formData.program_id || undefined,
            }, token);
            showToast(res.message || 'Credentials created successfully!');
            setFormData({ email: '', password: '', user_type: 'teacher', department_id: '', program_id: '' });
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create credentials');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > CREDENTIALS" title="Create User Credentials" />

            <div className="form-card" style={{ maxWidth: '560px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit}>
                    <div className="section-header">
                        <div className="section-header-icon"><ShieldIcon /></div>
                        <h3 className="section-title">Account Credentials</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        Create login credentials for teachers and admins. Teachers must be assigned a department and program.
                    </p>

                    <div className="field-group" style={{ marginBottom: '16px' }}>
                        <label className="field-label">Email Address <span className="required">*</span></label>
                        <div className="input-wrapper">
                            <MailIcon />
                            <input type="email" name="email" className="field-input" value={formData.email} onChange={handleChange} required placeholder="user@university.edu" />
                        </div>
                    </div>

                    <div className="field-group" style={{ marginBottom: '16px' }}>
                        <label className="field-label">Password <span className="required">*</span></label>
                        <div className="input-wrapper">
                            <LockIcon />
                            <input type="password" name="password" className="field-input" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
                        </div>
                    </div>

                    <div className="field-group" style={{ marginBottom: '16px' }}>
                        <label className="field-label">User Role <span className="required">*</span></label>
                        <select name="user_type" className="field-input field-select" value={formData.user_type} onChange={handleChange}>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {formData.user_type === 'teacher' && (<>
                        <div className="field-group" style={{ marginBottom: '16px' }}>
                            <label className="field-label">Department <span className="required">*</span></label>
                            <select name="department_id" className="field-input field-select" value={formData.department_id} onChange={handleChange} required>
                                <option value="">Select department</option>
                                {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                            </select>
                        </div>
                        <div className="field-group" style={{ marginBottom: '24px' }}>
                            <label className="field-label">Program <span className="required">*</span></label>
                            <select name="program_id" className="field-input field-select" value={formData.program_id} onChange={handleChange} required disabled={!formData.department_id}>
                                <option value="">Select program</option>
                                {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
                            </select>
                        </div>
                    </>)}

                    <button type="submit" className="btn-save" disabled={submitting} style={{ width: '100%' }}>
                        {submitting ? 'Creating...' : 'Create Credentials'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CredentialsPage;
