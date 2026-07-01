import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listAllComplaints, listActiveComplaints, listCategories, createCategory, adminUpdateComplaintStatus } from '../../../services/complaintsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, BellIcon, XIcon } from '../../Icons';

const ComplaintsListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [activeTab, setActiveTab] = useState('complaints');
    const [complaintTab, setComplaintTab] = useState('active');
    const [complaints, setComplaints] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [statusForm, setStatusForm] = useState({ status: 'in_progress', admin_response: '' });
    const [formData, setFormData] = useState({ category_name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const fetchComplaints = complaintTab === 'active'
                ? listActiveComplaints(token)
                : listAllComplaints(token);
            const [c, cat] = await Promise.all([fetchComplaints, listCategories(token)]);
            setComplaints(normalizeList(c));
            setCategories(normalizeList(cat));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token, complaintTab]);

    const displayedComplaints = complaintTab === 'active'
        ? complaints.filter(c => c.status !== 'resolved')
        : complaints;

    const currentData = activeTab === 'complaints' ? displayedComplaints : categories;
    const searchFields = activeTab === 'complaints' ? ['subject', 'status', 'category_name'] : ['category_name'];
    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(currentData, searchFields);

    const handleCreateCategory = async () => {
        setSubmitting(true);
        try {
            await createCategory(formData, token);
            showToast('Category created');
            setShowModal(false);
            load();
        } catch (e) { alert('Failed to create category'); }
        finally { setSubmitting(false); }
    };

    const handleStatusUpdate = async () => {
        if (!selectedComplaint) return;
        if (statusForm.status === 'resolved' && !statusForm.admin_response.trim()) {
            alert('Please write a response message when resolving.');
            return;
        }
        try {
            await adminUpdateComplaintStatus(selectedComplaint.complaint_id, statusForm, token);
            showToast('Complaint status updated');
            setSelectedComplaint(null);
            setStatusForm({ status: 'in_progress', admin_response: '' });
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to update status');
        }
    };

    if (loading) return <LoadingSpinner message="Loading complaints..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > COMPLAINTS" title="Complaints Management" />
            <div className="application-tabs">
                <button className={`app-tab ${activeTab === 'complaints' ? 'active' : ''}`} onClick={() => { setActiveTab('complaints'); setPage(1); }}>Complaints</button>
                <button className={`app-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => { setActiveTab('categories'); setPage(1); }}>Categories</button>
            </div>
            {activeTab === 'complaints' && (
                <div className="application-tabs" style={{ marginBottom: '12px' }}>
                    <button className={`app-tab ${complaintTab === 'active' ? 'active' : ''}`} onClick={() => setComplaintTab('active')}>Active Complaints</button>
                    <button className={`app-tab ${complaintTab === 'all' ? 'active' : ''}`} onClick={() => setComplaintTab('all')}>All Complaints</button>
                </div>
            )}
            <div className="form-card">
                {activeTab === 'categories' && (
                    <div className="table-toolbar">
                        <button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> <span>Add Category</span></button>
                    </div>
                )}
                <div className="data-table-wrapper">
                    {activeTab === 'complaints' ? (
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Subject</th><th>Category</th><th>Submitted By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={7} icon={<BellIcon size={20} />} title="No complaints found" />
                                ) : paginated.map((item, i) => (
                                    <tr key={item.complaint_id || i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td>{item.subject}</td>
                                        <td>{item.category_name || '—'}</td>
                                        <td>{item.submitted_by_username || item.submitted_by || '—'}</td>
                                        <td>{formatDate(item.submitted_at || item.created_at)}</td>
                                        <td><span className={getStatusBadgeClass(item.status)}>{item.status === 'in_progress' ? 'UNDER REVIEW' : item.status?.toUpperCase()}</span></td>
                                        <td>
                                            <button className="action-btn view-btn" onClick={() => { setSelectedComplaint(item); setStatusForm({ status: 'in_progress', admin_response: '' }); }}>Review</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Category Name</th><th>Description</th></tr></thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={3} icon={<BellIcon size={20} />} title="No categories found" />
                                ) : paginated.map((item, i) => (
                                    <tr key={item.category_id || i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td>{item.category_name}</td>
                                        <td>{item.description || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>

            {selectedComplaint && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header"><h3>{selectedComplaint.subject}</h3><button className="close-btn" onClick={() => setSelectedComplaint(null)}><XIcon /></button></div>
                        <div className="modal-body">
                            <p><strong>From:</strong> {selectedComplaint.submitted_by_username || 'Student'}</p>
                            <p style={{ marginTop: '12px' }}>{selectedComplaint.description}</p>
                            <div className="field-group" style={{ marginTop: '16px' }}>
                                <label className="field-label">Status</label>
                                <select className="field-input field-select" value={statusForm.status} onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}>
                                    <option value="in_progress">Under Review</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                            </div>
                            {statusForm.status === 'resolved' && (
                                <div className="field-group">
                                    <label className="field-label">Response Message <span className="required">*</span></label>
                                    <textarea className="field-input field-textarea" value={statusForm.admin_response} onChange={e => setStatusForm({ ...statusForm, admin_response: e.target.value })} />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setSelectedComplaint(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleStatusUpdate}>Update Status</button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header"><h3>Add Category</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group"><label className="field-label">Category Name</label><input className="field-input" value={formData.category_name} onChange={e => setFormData({ ...formData, category_name: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Description</label><textarea className="field-input field-textarea" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-primary" onClick={handleCreateCategory} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplaintsListingPage;
