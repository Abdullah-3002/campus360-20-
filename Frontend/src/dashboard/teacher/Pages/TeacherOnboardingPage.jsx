import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { completeTeacherOnboarding, listDesignations } from '../../../services/facultyService';
import { listDepartments } from '../../../services/academicsService';
import { normalizeList } from '../../../services/api';
import { LoadingSpinner } from '../../shared/helpers';
import { UserIcon } from '../../Icons';

const TeacherOnboardingPage = ({ onComplete }) => {
    const { token } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        qualification: '',
        specialization: '',
        office_floor: '',
        office_hours: '',
        department: '',
        designation: '',
        cnic: '',
        date_of_birth: '',
        gender: 'Male',
        phone_number: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relation: '',
        current_address: '',
        permanent_address: '',
    });

    useEffect(() => {
        if (!token) return;
        Promise.all([
            listDepartments(token).then(d => setDepartments(normalizeList(d))),
            listDesignations(token).then(d => setDesignations(normalizeList(d))),
        ]).finally(() => setLoading(false));
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.qualification.trim() || !form.specialization.trim() || !form.office_hours.trim()) {
            alert('Qualification, specialization, and office hours are required.');
            return;
        }
        setSubmitting(true);
        try {
            await completeTeacherOnboarding(form, token);
            alert('Profile completed! Welcome to Campus 360.');
            onComplete?.();
        } catch (err) {
            const data = err.response?.data;
            alert(data?.error || Object.values(data || {}).flat().join(', ') || 'Failed to save profile');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner message="Loading onboarding form..." />;

    return (
        <div className="page-container fade-in">
            <div className="form-card" style={{ maxWidth: '800px', margin: '30px auto', borderTop: '4px solid var(--primary)' }}>
                <div className="section-header">
                    <div className="section-header-icon"><UserIcon /></div>
                    <div>
                        <h2 className="section-title">Complete Your Faculty Profile</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                            Please provide your professional details before accessing the teacher dashboard.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
                    <div className="two-column-grid">
                        <div className="field-group">
                            <label className="field-label">Qualification *</label>
                            <input className="field-input" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. PhD Computer Science" required />
                        </div>
                        <div className="field-group">
                            <label className="field-label">Specialization *</label>
                            <input className="field-input" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Machine Learning" required />
                        </div>
                        <div className="field-group">
                            <label className="field-label">Department</label>
                            <select className="field-input field-select" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                                <option value="">Select department</option>
                                {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                            </select>
                        </div>
                        <div className="field-group">
                            <label className="field-label">Designation</label>
                            <select className="field-input field-select" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}>
                                <option value="">Select designation</option>
                                {designations.map(d => <option key={d.designation_id} value={d.designation_id}>{d.designation_title}</option>)}
                            </select>
                        </div>
                        <div className="field-group">
                            <label className="field-label">Office Floor</label>
                            <input className="field-input" value={form.office_floor} onChange={e => setForm({ ...form, office_floor: e.target.value })} />
                        </div>
                        <div className="field-group">
                            <label className="field-label">Office Hours *</label>
                            <input className="field-input" value={form.office_hours} onChange={e => setForm({ ...form, office_hours: e.target.value })} placeholder="Mon-Fri 9AM-1PM" required />
                        </div>
                        <div className="field-group">
                            <label className="field-label">CNIC</label>
                            <input className="field-input" value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })} placeholder="3520212345671" />
                        </div>
                        <div className="field-group">
                            <label className="field-label">Date of Birth</label>
                            <input type="date" className="field-input" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                        </div>
                        <div className="field-group">
                            <label className="field-label">Phone</label>
                            <input className="field-input" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} />
                        </div>
                        <div className="field-group">
                            <label className="field-label">Emergency Contact</label>
                            <input className="field-input" value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} />
                        </div>
                        <div className="field-group">
                            <label className="field-label">Emergency Phone</label>
                            <input className="field-input" value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} />
                        </div>
                        <div className="field-group">
                            <label className="field-label">Current Address</label>
                            <input className="field-input" value={form.current_address} onChange={e => setForm({ ...form, current_address: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn-save" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Complete Profile & Enter Dashboard'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TeacherOnboardingPage;
