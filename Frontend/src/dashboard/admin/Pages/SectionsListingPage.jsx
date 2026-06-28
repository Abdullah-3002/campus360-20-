import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { listSections, createSection } from '../../../services/sectionsService';
import { getAdmissionPrograms } from '../../../services/admissionService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, ClipboardIcon, XIcon, TrashIcon } from '../../Icons';

const SectionsListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [activeTab, setActiveTab] = useState('course'); // 'course' or 'batch'
    
    // Course sections state
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ section_name: '', course: '', semester: '', faculty: '', capacity: 40 });
    const [submitting, setSubmitting] = useState(false);

    // Batch sections state
    const [batchSections, setBatchSections] = useState([]);
    const [batchLoading, setBatchLoading] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [programs, setPrograms] = useState([]);
    const [batchFormData, setBatchFormData] = useState({ section_name: '', batch_year: 2026, program: '' });

    const load = async () => {
        setLoading(true);
        try { setItems(normalizeList(await listSections(token))); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadBatchSections = async () => {
        setBatchLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/api/sections/batch/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBatchSections(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setBatchLoading(false);
        }
    };

    const loadPrograms = async () => {
        try {
            const data = await getAdmissionPrograms(token);
            setPrograms(Array.isArray(data) ? data : []);
            if (data.length > 0) setBatchFormData(prev => ({ ...prev, program: data[0].program_id }));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (token) {
            load();
            loadBatchSections();
            loadPrograms();
        }
    }, [token]);

    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(items, ['section_name', 'course_code']);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await createSection(formData, token);
            showToast('Course section created');
            setShowModal(false);
            load();
        } catch (e) { alert(e.response?.data?.error || 'Failed to create section'); }
        finally { setSubmitting(false); }
    };

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
            showToast('Batch section created (e.g. Blue, Grey)');
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

            <div className="profile-tabs" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button 
                    className={`profile-tab-btn ${activeTab === 'course' ? 'active' : ''}`}
                    onClick={() => setActiveTab('course')}
                >
                    Course Sections
                </button>
                <button 
                    className={`profile-tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
                    onClick={() => setActiveTab('batch')}
                >
                    Batch Sections (Admissions)
                </button>
            </div>

            {activeTab === 'course' ? (
                <div className="form-card">
                    <div className="table-toolbar">
                        <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                            <input type="text" placeholder="Search course sections..." className="search-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        </div>
                        <button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> <span>Add Course Section</span></button>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Section</th><th>Course</th><th>Faculty</th><th>Capacity</th><th>Status</th></tr></thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={6} icon={<ClipboardIcon size={20} />} title="No sections found" />
                                ) : paginated.map((item, i) => (
                                    <tr key={item.section_id || i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td>{item.section_name}</td>
                                        <td>{item.course_code || item.course?.course_code || '—'}</td>
                                        <td>{item.faculty_name || '—'}</td>
                                        <td>{item.capacity || '—'}</td>
                                        <td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'ACTIVE'}</span></td>
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
                        <h3 style={{ margin: 0 }}>Admission Batch Sections (e.g. Blue, Grey)</h3>
                        <button className="btn-add" onClick={() => setShowBatchModal(true)}><PlusIcon /> <span>Create Batch Section</span></button>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Program</th><th>Batch Year</th><th>Section Name</th><th>Action</th></tr></thead>
                            <tbody>
                                {batchSections.length === 0 ? (
                                    <EmptyRow colSpan={5} icon={<ClipboardIcon size={20} />} title="No batch sections created yet" />
                                ) : batchSections.map((item, i) => (
                                    <tr key={item.batch_section_id || i}>
                                        <td>{i + 1}</td>
                                        <td>{item.program_name || item.program_code}</td>
                                        <td>Batch {item.batch_year}</td>
                                        <td><strong>{item.section_name}</strong></td>
                                        <td>
                                            <button className="action-btn delete-btn" onClick={() => handleDeleteBatchSection(item.batch_section_id)}>
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

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header"><h3>Add Course Section</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group"><label className="field-label">Section Name</label><input className="field-input" value={formData.section_name} onChange={e => setFormData({ ...formData, section_name: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Course ID</label><input type="number" className="field-input" value={formData.course} onChange={e => setFormData({ ...formData, course: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Semester ID</label><input type="number" className="field-input" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Capacity</label><input type="number" className="field-input" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                        </div>
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
                                    {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name} ({p.program_code})</option>)}
                                </select>
                            </div>
                            <div className="field-group">
                                <label className="field-label">Batch Year</label>
                                <input type="number" className="field-input" value={batchFormData.batch_year} onChange={e => setBatchFormData({ ...batchFormData, batch_year: parseInt(e.target.value) || 2026 })} />
                            </div>
                            <div className="field-group">
                                <label className="field-label">Section Name (e.g. Blue, Grey, A, B)</label>
                                <input type="text" className="field-input" placeholder="e.g. blue" value={batchFormData.section_name} onChange={e => setBatchFormData({ ...batchFormData, section_name: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleCreateBatchSection} disabled={submitting}>{submitting ? 'Creating...' : 'Create Section'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SectionsListingPage;
