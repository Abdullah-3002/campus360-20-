import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listSemesters, createSemester, updateSemester } from '../../../services/academicsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, XIcon, FileTextIcon } from '../../Icons';

const SemestersPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const load = () => listSemesters(token).then(d => setItems(normalizeList(d)));
    useEffect(() => { if (token) load().finally(() => setLoading(false)); }, [token]);

    const openCreate = () => {
        setEditId(null);
        const y = new Date().getFullYear();
        setForm({
            semester_name: `Spring ${y}`, academic_year: y, semester_type: 'spring',
            start_date: '', end_date: '', mid_term_cutoff_date: '', marks_grace_end_date: '',
            registration_start_date: '', registration_end_date: '', is_current: false,
        });
        setShowModal(true);
    };

    const openEdit = (item) => {
        setEditId(item.semester_id);
        setForm({ ...item });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const payload = { ...form, academic_year: parseInt(form.academic_year, 10), is_current: !!form.is_current };
            if (editId) await updateSemester(editId, payload, token);
            else await createSemester(payload, token);
            showToast(editId ? 'Semester updated' : 'Semester created');
            setShowModal(false);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to save semester');
        } finally {
            setSubmitting(false);
        }
    };

    const { paginated, filtered, page, setPage, totalPages, pageSize } = useTableFilter(items, ['semester_name']);

    if (loading) return <LoadingSpinner message="Loading semesters..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > SEMESTERS" title="Semester Management" />
            <div className="form-card">
                <div className="table-toolbar">
                    <button className="btn-add" onClick={openCreate}><PlusIcon /> <span>Add Semester</span></button>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Name</th><th>Start</th><th>End</th><th>Mid Cutoff</th><th>Grace End</th><th>Current</th><th>Actions</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={8} icon={<FileTextIcon />} title="No semesters" /> : paginated.map((item, i) => (
                                <tr key={item.semester_id}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    <td>{item.semester_name}</td>
                                    <td>{formatDate(item.start_date)}</td>
                                    <td>{formatDate(item.end_date)}</td>
                                    <td>{formatDate(item.mid_term_cutoff_date)}</td>
                                    <td>{formatDate(item.marks_grace_end_date)}</td>
                                    <td><span className={getStatusBadgeClass(item.is_current ? 'active' : 'inactive')}>{item.is_current ? 'YES' : 'NO'}</span></td>
                                    <td><button className="action-btn view-btn" onClick={() => openEdit(item)}>Edit</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-modal" style={{ maxWidth: 560 }}>
                        <div className="modal-header"><h3>{editId ? 'Edit' : 'Add'} Semester</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group"><label className="field-label">Name</label><input className="field-input" value={form.semester_name || ''} onChange={e => setForm({ ...form, semester_name: e.target.value })} /></div>
                            <div className="two-column-grid">
                                <div className="field-group"><label className="field-label">Start Date</label><input type="date" className="field-input" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">End Date</label><input type="date" className="field-input" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Mid-Term Cutoff</label><input type="date" className="field-input" value={form.mid_term_cutoff_date || ''} onChange={e => setForm({ ...form, mid_term_cutoff_date: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Marks Grace End</label><input type="date" className="field-input" value={form.marks_grace_end_date || ''} onChange={e => setForm({ ...form, marks_grace_end_date: e.target.value })} /></div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                                <input type="checkbox" checked={!!form.is_current} onChange={e => setForm({ ...form, is_current: e.target.checked })} /> Set as current semester
                            </label>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSave} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SemestersPage;
