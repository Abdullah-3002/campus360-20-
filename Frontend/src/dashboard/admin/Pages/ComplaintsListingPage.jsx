import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listAllComplaints, listCategories, createCategory, assignComplaint } from '../../../services/complaintsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, BellIcon, XIcon } from '../../Icons';

const ComplaintsListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [activeTab, setActiveTab] = useState('complaints');
    const [complaints, setComplaints] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ category_name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [c, cat] = await Promise.all([listAllComplaints(token), listCategories(token)]);
            setComplaints(normalizeList(c));
            setCategories(normalizeList(cat));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const currentData = activeTab === 'complaints' ? complaints : categories;
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

    const handleAssign = async (id) => {
        const staffId = prompt('Enter staff ID to assign:');
        if (!staffId) return;
        try {
            await assignComplaint(id, { assigned_to: staffId }, token);
            showToast('Complaint assigned');
            load();
        } catch (e) { alert('Failed to assign complaint'); }
    };

    if (loading) return <LoadingSpinner message="Loading complaints..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > COMPLAINTS" title="Complaints Management" />
            <div className="application-tabs">
                <button className={`app-tab ${activeTab === 'complaints' ? 'active' : ''}`} onClick={() => { setActiveTab('complaints'); setPage(1); }}>All Complaints</button>
                <button className={`app-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => { setActiveTab('categories'); setPage(1); }}>Categories</button>
            </div>
            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input type="text" placeholder="Search..." className="search-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    {activeTab === 'categories' && (
                        <button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> <span>Add Category</span></button>
                    )}
                </div>
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
                                        <td>{item.submitted_by || item.username || '—'}</td>
                                        <td>{formatDate(item.created_at)}</td>
                                        <td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'OPEN'}</span></td>
                                        <td><button className="action-btn view-btn" onClick={() => handleAssign(item.complaint_id)}>Assign</button></td>
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

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header"><h3>Add Category</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group"><label className="field-label">Category Name</label><input className="field-input" value={formData.category_name} onChange={e => setFormData({ ...formData, category_name: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Description</label><textarea className="field-input field-textarea" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleCreateCategory} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplaintsListingPage;
