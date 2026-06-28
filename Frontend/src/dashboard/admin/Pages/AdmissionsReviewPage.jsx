import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import {
    adminListApplications,
    adminGetApplicationDetail,
    adminMakeDecision,
    adminConfirmRegistration,
    adminDownloadDocument,
    adminVerifyDocument,
} from '../../../services/admissionService';
import { changeUserType } from '../../../services/authService';
import {
    PageHeader, useTableFilter, TablePagination, LoadingSpinner,
    EmptyRow, useToast, getStatusBadgeClass, formatDate,
} from '../../shared/helpers';
import { FileTextIcon, EyeIcon, XIcon, CheckCircleIcon } from '../../Icons';

const STATUS_FILTERS = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'waitlist', label: 'Waitlist' },
    { value: 'registered', label: 'Registered' },
];

const USER_TYPES = ['applicant', 'student'];

const DECIDED_STATUSES = new Set(['approved', 'rejected', 'waitlist', 'registered']);

const DetailRow = ({ label, value }) => (
    <div className="review-detail-row">
        <span className="review-detail-label">{label}</span>
        <span className="review-detail-value">{value || '—'}</span>
    </div>
);

const AdmissionsReviewPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedApp, setSelectedApp] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [decision, setDecision] = useState('approved');
    const [rejectionReason, setRejectionReason] = useState('');
    const [remarks, setRemarks] = useState('');
    const [offeredSection, setOfferedSection] = useState('');
    const [batchSections, setBatchSections] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [newUserType, setNewUserType] = useState('student');

    const load = async () => {
        setLoading(true);
        try {
            const data = await adminListApplications(token, statusFilter);
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            showToast('Failed to load applications', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchBatchSections = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/sections/batch/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBatchSections(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { 
        if (token) {
            load();
            fetchBatchSections();
        }
    }, [token, statusFilter]);

    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(
        items,
        ['application_number', 'applicant_name', 'applicant_email', 'program_name', 'status']
    );

    const refreshDetail = async (appId) => {
        const data = await adminGetApplicationDetail(appId, token);
        setDetail(data);
        if (data.decision) {
            setDecision(data.decision.decision || 'approved');
            setRejectionReason(data.decision.rejection_reason || '');
            setRemarks(data.decision.remarks || '');
            setOfferedSection(data.decision.offered_section || '');
        }
        return data;
    };

    const openDetail = async (app) => {
        setSelectedApp(app);
        setDetail(null);
        setDetailLoading(true);
        setDecision('approved');
        setRejectionReason('');
        setRemarks('');
        setOfferedSection('');
        setNewUserType(app.user_type === 'applicant' ? 'student' : (app.user_type || 'student'));
        try {
            await refreshDetail(app.id);
        } catch (e) {
            showToast('Failed to load application details', 'error');
            setSelectedApp(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setSelectedApp(null);
        setDetail(null);
    };

    const hasDecision = detail && DECIDED_STATUSES.has(detail.status);
    const isRegistered = detail?.status === 'registered';

    const handleVerifyDoc = async (docId) => {
        try {
            await adminVerifyDocument(selectedApp.id, docId, token);
            showToast('Document verified successfully!');
            await refreshDetail(selectedApp.id);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to verify document');
        }
    };

    const handleDecision = async () => {
        if (!selectedApp) return;
        if (!remarks.trim()) {
            alert('Remarks are required.');
            return;
        }
        if (decision === 'rejected' && !rejectionReason.trim()) {
            alert('Please provide a rejection reason.');
            return;
        }
        setSubmitting(true);
        try {
            await adminMakeDecision(selectedApp.id, {
                decision,
                rejection_reason: rejectionReason,
                remarks,
                offered_section: offeredSection,
            }, token);
            showToast(`Application ${decision}.`);
            await refreshDetail(selectedApp.id);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to submit decision');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmRegistration = async () => {
        if (!selectedApp) return;
        if (!confirm('Confirm student registration? This will create a student record, enroll in semester courses, and set role to student.')) return;
        setSubmitting(true);
        try {
            const result = await adminConfirmRegistration(selectedApp.id, token);
            showToast(`Registration confirmed: ${result.registration_number}`);
            await refreshDetail(selectedApp.id);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to confirm registration');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChangeRole = async () => {
        if (!detail?.applicant?.user_id) return;
        if (!hasDecision) {
            alert('Please submit an accept/reject decision before changing the user role.');
            return;
        }
        if (newUserType === 'student' && detail.status === 'approved' && !isRegistered) {
            return handleConfirmRegistration();
        }
        if (!confirm(`Change user role to "${newUserType}"? The user will see the ${newUserType} dashboard on next login.`)) return;
        setSubmitting(true);
        try {
            await changeUserType(detail.applicant.user_id, newUserType, token);
            showToast(`Role changed to ${newUserType}.`);
            await refreshDetail(selectedApp.id);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to change role');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownloadDoc = async (docId, fileName) => {
        try {
            const response = await adminDownloadDocument(selectedApp.id, docId, token);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            alert('Failed to download document');
        }
    };

    if (loading) return <LoadingSpinner message="Loading applications..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > ADMISSIONS" title="Admission Applications Review" />

            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input
                            type="text"
                            placeholder="Search applications..."
                            className="search-input"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <select
                        className="field-input field-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ maxWidth: '180px' }}
                    >
                        {STATUS_FILTERS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                </div>

                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Sr#</th>
                                <th>App No</th>
                                <th>Applicant</th>
                                <th>Program</th>
                                <th>Submitted</th>
                                <th>Status</th>
                                <th>Role</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <EmptyRow colSpan={8} icon={<FileTextIcon size={20} />} title="No applications found" />
                            ) : paginated.map((item, i) => (
                                <tr key={item.id}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    <td><span className="app-number">{item.application_number}</span></td>
                                    <td>
                                        <div>{item.applicant_name || '—'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{item.applicant_email}</div>
                                    </td>
                                    <td>{item.program_name || '—'}</td>
                                    <td>{formatDate(item.submitted_at)}</td>
                                    <td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase()}</span></td>
                                    <td>{item.user_type || '—'}</td>
                                    <td>
                                        <button className="action-btn view-btn" onClick={() => openDetail(item)} title="Review">
                                            <EyeIcon size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />
                )}
            </div>

            {selectedApp && (
                <div className="modal-overlay" onClick={closeDetail}>
                    <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3>Application Review — {selectedApp.application_number}</h3>
                            <button className="close-btn" onClick={closeDetail}><XIcon /></button>
                        </div>

                        {detailLoading ? (
                            <LoadingSpinner message="Loading details..." />
                        ) : detail ? (
                            <div className="modal-body" style={{ padding: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <h3 className="review-section-title">Application</h3>
                                        <DetailRow label="Status" value={detail.status} />
                                        <DetailRow label="Program" value={detail.program_name} />
                                        <DetailRow label="Admission Type" value={detail.admission_type} />
                                        <DetailRow label="Submitted" value={formatDate(detail.submitted_at)} />
                                        <DetailRow label="Preferences" value={
                                            detail.preferences?.map(p => `${p.preference_order}. ${p.program_name}`).join(', ')
                                        } />
                                    </div>
                                    <div>
                                        <h3 className="review-section-title">Applicant Profile</h3>
                                        <DetailRow label="Name" value={`${detail.applicant?.first_name || ''} ${detail.applicant?.last_name || ''}`} />
                                        <DetailRow label="Email" value={detail.applicant?.email} />
                                        <DetailRow label="CNIC" value={detail.applicant?.cnic} />
                                        <DetailRow label="Phone" value={detail.applicant?.phone} />
                                        <DetailRow label="Gender" value={detail.applicant?.gender} />
                                        <DetailRow label="DOB" value={detail.applicant?.date_of_birth} />
                                        <DetailRow label="Address" value={
                                            [detail.applicant?.perm_city, detail.applicant?.perm_state, detail.applicant?.perm_country].filter(Boolean).join(', ')
                                        } />
                                        <DetailRow label="Guardian" value={detail.applicant?.guardian_name} />
                                    </div>
                                </div>

                                <h3 className="review-section-title-spaced">Academic Records</h3>
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>Level</th><th>Qualification</th><th>Institute</th><th>Obtained</th><th>Total</th><th>Years</th></tr>
                                        </thead>
                                        <tbody>
                                            {(detail.applicant?.academic_records || []).length === 0 ? (
                                                <tr><td colSpan={6} className="empty-row">No records</td></tr>
                                            ) : detail.applicant.academic_records.map(r => (
                                                <tr key={r.id}>
                                                    <td>{r.qualification_level}</td>
                                                    <td>{r.qualification}</td>
                                                    <td>{r.institute}</td>
                                                    <td>{r.obtained}</td>
                                                    <td>{r.total}</td>
                                                    <td>{r.start_year}–{r.end_year}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                 <h3 className="review-section-title-spaced">Documents</h3>
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>Type</th><th>File</th><th>Status</th><th>Action</th></tr>
                                        </thead>
                                        <tbody>
                                            {(detail.applicant?.documents || []).length === 0 ? (
                                                <tr><td colSpan={4} className="empty-row">No documents uploaded</td></tr>
                                            ) : detail.applicant.documents.map(doc => (
                                                <tr key={doc.document_id}>
                                                    <td>{doc.document_type_display || doc.document_type}</td>
                                                    <td>{doc.file_name}</td>
                                                    <td>
                                                        <span className={doc.is_verified ? 'status-badge status-approved' : 'status-badge status-pending'}>
                                                            {doc.is_verified ? 'Verified' : 'Unverified'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button
                                                                className="action-btn view-btn"
                                                                onClick={() => handleDownloadDoc(doc.document_id, doc.file_name)}
                                                            >
                                                                Download
                                                            </button>
                                                            {!doc.is_verified && !isRegistered && (
                                                                <button
                                                                    className="btn-verify"
                                                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                                                    onClick={() => handleVerifyDoc(doc.document_id)}
                                                                >
                                                                    Approve / Verify
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="admin-actions-panel">
                                    <h3 className="review-section-title">Admin Actions</h3>

                                    {hasDecision && (
                                        <div className={`decision-banner ${detail.status === 'registered' ? 'approved' : detail.status}`}>
                                            Decision recorded: <strong>{detail.status?.toUpperCase()}</strong>
                                            {detail.decision?.rejection_reason && ` — ${detail.decision.rejection_reason}`}
                                            {detail.decision?.offered_section && ` — Offered Section: ${detail.decision.offered_section}`}
                                            {isRegistered && ' — Student registered successfully'}
                                        </div>
                                    )}

                                    <div className="workflow-step-label">Step 1 — Accept or Reject</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div className="field-group">
                                            <label className="field-label">Decision <span className="required">*</span></label>
                                            <select
                                                className="field-input field-select"
                                                value={decision}
                                                onChange={e => setDecision(e.target.value)}
                                                disabled={isRegistered}
                                            >
                                                <option value="approved">Approve</option>
                                                <option value="rejected">Reject</option>
                                                <option value="waitlist">Waitlist</option>
                                            </select>
                                        </div>

                                        {decision === 'approved' && (
                                            <div className="field-group">
                                                <label className="field-label">Offered Section</label>
                                                <select
                                                    className="field-input field-select"
                                                    value={offeredSection}
                                                    onChange={e => setOfferedSection(e.target.value)}
                                                    disabled={isRegistered}
                                                >
                                                    <option value="">Select Section (Default / Auto)</option>
                                                    {batchSections.map(s => (
                                                        <option key={s.batch_section_id} value={s.section_name}>
                                                            {s.program_code} — Batch {s.batch_year} ({s.section_name})
                                                        </option>
                                                    ))}
                                                    <option value="blue">Blue</option>
                                                    <option value="grey">Grey</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {decision === 'rejected' && (
                                        <div className="field-group" style={{ marginBottom: '12px' }}>
                                            <label className="field-label">Rejection Reason</label>
                                            <textarea
                                                className="field-input"
                                                rows={2}
                                                value={rejectionReason}
                                                onChange={e => setRejectionReason(e.target.value)}
                                                placeholder="Reason for rejection (shown internally)"
                                                disabled={isRegistered}
                                            />
                                        </div>
                                    )}

                                    <div className="field-group" style={{ marginBottom: '16px' }}>
                                        <label className="field-label">Remarks</label>
                                        <textarea
                                            className="field-input"
                                            rows={2}
                                            value={remarks}
                                            onChange={e => setRemarks(e.target.value)}
                                            placeholder="Optional remarks"
                                            disabled={isRegistered}
                                        />
                                    </div>

                                    {!isRegistered && (
                                        <button className="btn-save" onClick={handleDecision} disabled={submitting} style={{ marginBottom: '20px' }}>
                                            {submitting ? 'Saving...' : hasDecision ? 'Update Decision' : 'Submit Decision'}
                                        </button>
                                    )}

                                    <div className={`${!hasDecision ? 'workflow-step-disabled' : ''}`}>
                                        <div className="workflow-step-label">
                                            Step 2 — Change Role {(!hasDecision && '(submit decision first)')}
                                        </div>

                                        {detail.status === 'approved' && !isRegistered && (
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                                To make this applicant a student, use Confirm Student Registration below. This creates their student record and enrolls them in semester courses.
                                            </p>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                            <div className="field-group">
                                                <label className="field-label">Change User Role</label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <select
                                                        className="field-input field-select"
                                                        value={newUserType}
                                                        onChange={e => setNewUserType(e.target.value)}
                                                        disabled={!hasDecision || isRegistered}
                                                    >
                                                        {USER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                    <button
                                                        className="btn-verify"
                                                        onClick={handleChangeRole}
                                                        disabled={submitting || !hasDecision || isRegistered}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {detail.status === 'approved' && !isRegistered && (
                                            <button className="btn-verify" onClick={handleConfirmRegistration} disabled={submitting || !hasDecision}>
                                                Confirm Student Registration
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdmissionsReviewPage;
