import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { listSections } from '../../../services/sectionsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, ClipboardIcon, XIcon, TrashIcon } from '../../Icons';

const SectionsListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [activeTab, setActiveTab] = useState('course');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [batchSections, setBatchSections] = useState([]);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [programs, setPrograms] = useState([]);
    const [batchFormData, setBatchFormData] = useState({ section_name: '', batch_year: new Date().getFullYear(), program: '' });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try { setItems(normalizeList(await listSections(token))); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadBatchSections = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/sections/batch/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBatchSections(Array.isArray(res.data) ? res.data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (token) {
            load();
            loadBatchSections();
            axios.get('http://localhost:8000/api/academics/programs/', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => setPrograms(Array.isArray(res.data) ? res.data : [])).catch(console.error);
        }
    }, [token]);

    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } =
        useTableFilter(items, ['section_name', 'course_code', 'faculty_name', 'program_name']);

    const handleCreateBatchSection = async () => {
        if (!batchFormData.section_name || !batchFormData.program) {
            alert('Section name and program are required');
            return;
        }
        setSubmitting(true);
        try {
            await axios.post('http://localhost:8000/api/sections/batch/', batchFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Batch section created');
            setShowBatchModal(false);
            loadBatchSections();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to create batch section');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBatchSection = async (id) => {
        if (!confirm('Delete this batch section?')) return;
        try {
            await axios.delete(`http://localhost:8000/api/sections/batch/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Batch section deleted');
            loadBatchSections();
        } catch (e) {
            alert('Failed to delete batch section');
        }
    };

    if (loading) return <LoadingSpinner message="Loading sections..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > SECTIONS" title="Sections Management" />

            <div className="application-tabs">
                <button className={`app-tab ${activeTab === 'course' ? 'active' : ''}`} onClick={() => setActiveTab('course')}>
                    Course Sections
                </button>
                <button className={`app-tab ${activeTab === 'batch' ? 'active' : ''}`} onClick={() => setActiveTab('batch')}>
                    Batch Sections
                </button>
            </div>

            {activeTab === 'course' ? (
                <div className="form-card">
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        Read-only list of course sections assigned to teachers with program and semester context.
                    </p>
                    <div className="table-toolbar">
                        <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                            <input type="text" placeholder="Search sections..." className="search-input" value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        </div>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Sr#</th><th>Section</th><th>Course</th><th>Teacher</th>
                                    <th>Program</th><th>Semester</th><th>Enrolled</th><th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={8} icon={<ClipboardIcon size={20} />} title="No sections found" />
                                ) : paginated.map((item, i) => (
                                    <tr key={item.section_id || i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td>{item.section_name}</td>
                                        <td>{item.course_code} — {item.course_name}</td>
                                        <td>{item.faculty_name || '—'}</td>
                                        <td>{item.program_name || item.program_code || '—'}</td>
                                        <td>{item.curriculum_semester ? `Sem ${item.curriculum_semester}` : item.semester_name || '—'}</td>
                                        <td>{item.enrolled_count}/{item.max_capacity}</td>
                                        <td><span className={getStatusBadgeClass(item.is_active ? 'active' : 'inactive')}>{item.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
                </div>
            ) : (
                <div className="form-card">
                    <div className="table-toolbar">
                        <h3 style={{ margin: 0 }}>Admission Batch Sections</h3>
                        <button className="btn-add" onClick={() => setShowBatchModal(true)}><PlusIcon /> <span>Create Batch Section</span></button>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Program</th><th>Batch Year</th><th>Section Name</th><th>Action</th></tr></thead>
                            <tbody>
                                {batchSections.length === 0 ? (
                                    <EmptyRow colSpan={5} icon={<ClipboardIcon size={20} />} title="No batch sections" />
                                ) : batchSections.map((item, i) => (
                                    <tr key={item.batch_section_id || i}>
                                        <td>{i + 1}</td>
                                        <td>{item.program_name || item.program_code}</td>
                                        <td>Batch {item.batch_year}</td>
                                        <td><strong>{item.section_name}</strong></td>
                                        <td>
                                            <button className="action-btn danger" onClick={() => handleDeleteBatchSection(item.batch_section_id)}>
                                                <TrashIcon size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showBatchModal && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header"><h3>Create Batch Section</h3><button className="close-btn" onClick={() => setShowBatchModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group">
                                <label className="field-label">Program</label>
                                <select className="field-input field-select" value={batchFormData.program} onChange={e => setBatchFormData({ ...batchFormData, program: e.target.value })}>
                                    <option value="">Select program</option>
                                    {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
                                </select>
                            </div>
                            <div className="field-group">
                                <label className="field-label">Batch Year</label>
                                <input type="number" className="field-input" value={batchFormData.batch_year}
                                    onChange={e => setBatchFormData({ ...batchFormData, batch_year: parseInt(e.target.value, 10) })} />
                            </div>
                            <div className="field-group">
                                <label className="field-label">Section Name</label>
                                <select className="field-input field-select" value={batchFormData.section_name} onChange={e => setBatchFormData({ ...batchFormData, section_name: e.target.value })}>
                                    <option value="">Select</option>
                                    <option value="Blue">Blue</option>
                                    <option value="Grey">Grey</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleCreateBatchSection} disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SectionsListingPage;
