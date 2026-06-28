import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listFaculty, createFaculty } from '../../../services/facultyService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, UserIcon, XIcon } from '../../Icons';

const FacultyListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', department: '', designation: '', qualification: '' });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await listFaculty(token);
            setItems(normalizeList(data));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(items, ['employee_id', 'username', 'department_name']);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await createFaculty(formData, token);
            showToast('Faculty member created');
            setShowModal(false);
            load();
        } catch (e) { alert(e.response?.data?.error || 'Failed to create faculty'); }
        finally { setSubmitting(false); }
    };

    if (loading) return <LoadingSpinner message="Loading faculty..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > FACULTY" title="Faculty Management" />
            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input type="text" placeholder="Search faculty..." className="search-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> <span>Add Faculty</span></button>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Employee ID</th><th>Name</th><th>Department</th><th>Designation</th><th>Status</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <EmptyRow colSpan={6} icon={<UserIcon size={20} />} title="No faculty found" />
                            ) : paginated.map((item, i) => (
                                <tr key={item.faculty_id || i}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    <td><span className="app-number">{item.employee_id || '—'}</span></td>
                                    <td>{item.username || item.user?.username || '—'}</td>
                                    <td>{item.department_name || item.department?.department_name || '—'}</td>
                                    <td>{item.designation_name || item.designation?.designation_name || '—'}</td>
                                    <td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'ACTIVE'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header"><h3>Add Faculty Member</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group"><label className="field-label">Username</label><input className="field-input" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Email</label><input type="email" className="field-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Password</label><input type="password" className="field-input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Qualification</label><input className="field-input" value={formData.qualification} onChange={e => setFormData({ ...formData, qualification: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyListingPage;
