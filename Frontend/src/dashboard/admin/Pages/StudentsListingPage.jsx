import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listStudents, createStudent } from '../../../services/studentsService';
import { listPrograms } from '../../../services/academicsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, UserIcon, XIcon } from '../../Icons';

const StudentsListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', program: '', batch_year: new Date().getFullYear() });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [studentsData, programsData] = await Promise.all([
                listStudents(token),
                listPrograms(token),
            ]);
            setItems(normalizeList(studentsData));
            setPrograms(normalizeList(programsData));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(items, ['registration_number', 'username', 'program_name']);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await createStudent(formData, token);
            showToast('Student created successfully');
            setShowModal(false);
            load();
        } catch (e) { alert(e.response?.data?.error || 'Failed to create student'); }
        finally { setSubmitting(false); }
    };

    if (loading) return <LoadingSpinner message="Loading students..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > STUDENTS" title="Students Management" />
            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input type="text" placeholder="Search students..." className="search-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> <span>Add Student</span></button>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Reg No</th><th>Name</th><th>Program</th><th>Batch</th><th>Status</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <EmptyRow colSpan={6} icon={<UserIcon size={20} />} title="No students found" />
                            ) : paginated.map((item, i) => (
                                <tr key={item.student_id || i}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    <td><span className="app-number">{item.registration_number}</span></td>
                                    <td>{item.username || item.user?.username || '—'}</td>
                                    <td>{item.program_name || item.program?.program_name || '—'}</td>
                                    <td>{item.batch_year || '—'}</td>
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
                        <div className="modal-header"><h3>Add Student</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group"><label className="field-label">Username</label><input className="field-input" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Email</label><input type="email" className="field-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Password</label><input type="password" className="field-input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Program</label>
                                <select className="field-input field-select" value={formData.program} onChange={e => setFormData({ ...formData, program: e.target.value })}>
                                    <option value="">Select Program</option>
                                    {programs.map(p => (
                                        <option key={p.program_id} value={p.program_id}>{p.program_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field-group"><label className="field-label">Batch Year</label><input type="number" className="field-input" value={formData.batch_year} onChange={e => setFormData({ ...formData, batch_year: e.target.value })} /></div>
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

export default StudentsListingPage;
