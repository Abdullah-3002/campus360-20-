import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listSections, createSection, updateSection, listBatchSections, createBatchSection, deleteBatchSection } from '../../../services/sectionsService';
import { listSemesters, listCourses, listPrograms } from '../../../services/academicsService';
import { listFaculty } from '../../../services/facultyService';
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
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [editSectionId, setEditSectionId] = useState(null);
    const [sectionForm, setSectionForm] = useState({});
    const [semesters, setSemesters] = useState([]);
    const [courses, setCourses] = useState([]);
    const [facultyList, setFacultyList] = useState([]);

    const load = async () => {
        setLoading(true);
        try { setItems(normalizeList(await listSections(token, true))); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadBatchSections = async () => {
        try {
            const data = await listBatchSections(token);
            setBatchSections(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (token) {
            load();
            loadBatchSections();
            Promise.all([
                listSemesters(token),
                listCourses(token),
                listFaculty(token),
                listPrograms(token),
            ]).then(([sem, crs, fac, prog]) => {
                setSemesters(normalizeList(sem));
                setCourses(normalizeList(crs));
                setFacultyList(normalizeList(fac));
                setPrograms(normalizeList(prog));
            }).catch(console.error);
        }
    }, [token]);

    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } =
        useTableFilter(items, ['section_name', 'course_code', 'faculty_name', 'program_name']);

    const openSectionModal = (item = null) => {
        if (item) {
            setEditSectionId(item.section_id);
            setSectionForm({
                course: item.course, semester: item.semester, faculty: item.faculty || '',
                section_name: item.section_name, section_type: item.section_type || 'theory',
                max_capacity: item.max_capacity, is_active: item.is_active,
            });
        } else {
            setEditSectionId(null);
            setSectionForm({ section_name: 'A', section_type: 'theory', max_capacity: 40, is_active: true, course: '', semester: '', faculty: '' });
        }
        setShowSectionModal(true);
    };

    const handleSaveSection = async () => {
        if (!sectionForm.course || !sectionForm.semester || !sectionForm.faculty) {
            alert('Course, semester, and teacher are required.');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                ...sectionForm,
                course: parseInt(sectionForm.course, 10),
                semester: parseInt(sectionForm.semester, 10),
                faculty: parseInt(sectionForm.faculty, 10),
                max_capacity: parseInt(sectionForm.max_capacity, 10) || 40,
            };
            if (editSectionId) await updateSection(editSectionId, payload, token);
            else await createSection(payload, token);
            showToast(editSectionId ? 'Section updated' : 'Section created');
            setShowSectionModal(false);
            load();
        } catch (e) {
            alert(e.response?.data?.error || JSON.stringify(e.response?.data) || 'Failed to save section');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateBatchSection = async () => {
        if (!batchFormData.section_name || !batchFormData.program) {
            alert('Section name and program are required');
            return;
        }
        setSubmitting(true);
        try {
            await createBatchSection(batchFormData, token);
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
            await deleteBatchSection(id, token);
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
                    <div className="table-toolbar">
                        <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                            <input type="text" placeholder="Search sections..." className="search-input" value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        </div>
                        <button className="btn-add" onClick={() => openSectionModal()}><PlusIcon /> <span>Assign Section</span></button>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Sr#</th><th>Section</th><th>Course</th><th>Teacher</th>
                                    <th>Program</th><th>Semester</th><th>Enrolled</th><th>Marks</th><th>Status</th><th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={10} icon={<ClipboardIcon size={20} />} title="No sections found" />
                                ) : paginated.map((item, i) => (
                                    <tr key={item.section_id || i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td>{item.section_name}</td>
                                        <td>{item.course_code} — {item.course_name}</td>
                                        <td>{item.faculty_name || '—'}</td>
                                        <td>{item.program_name || item.program_code || '—'}</td>
                                        <td>{item.curriculum_semester ? `Sem ${item.curriculum_semester}` : item.semester_name || '—'}</td>
                                        <td>{item.enrolled_count}/{item.max_capacity}</td>
                                        <td>{item.marks_locked ? 'Locked' : 'Open'}</td>
                                        <td><span className={getStatusBadgeClass(item.is_active ? 'active' : 'inactive')}>{item.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                                        <td><button className="action-btn view-btn" onClick={() => openSectionModal(item)}>Edit</button></td>
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

            {showSectionModal && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header"><h3>{editSectionId ? 'Edit' : 'Create'} Course Section</h3><button className="close-btn" onClick={() => setShowSectionModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group"><label className="field-label">Course</label>
                                <select className="field-input field-select" value={sectionForm.course} onChange={e => setSectionForm({ ...sectionForm, course: e.target.value })}>
                                    <option value="">Select course</option>
                                    {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_name}</option>)}
                                </select>
                            </div>
                            <div className="field-group"><label className="field-label">Semester</label>
                                <select className="field-input field-select" value={sectionForm.semester} onChange={e => setSectionForm({ ...sectionForm, semester: e.target.value })}>
                                    <option value="">Select semester</option>
                                    {semesters.map(s => <option key={s.semester_id} value={s.semester_id}>{s.semester_name}</option>)}
                                </select>
                            </div>
                            <div className="field-group"><label className="field-label">Teacher</label>
                                <select className="field-input field-select" value={sectionForm.faculty} onChange={e => setSectionForm({ ...sectionForm, faculty: e.target.value })}>
                                    <option value="">Select teacher</option>
                                    {facultyList.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.username || f.employee_code}</option>)}
                                </select>
                            </div>
                            <div className="two-column-grid">
                                <div className="field-group"><label className="field-label">Section Name</label><input className="field-input" value={sectionForm.section_name || ''} onChange={e => setSectionForm({ ...sectionForm, section_name: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Max Capacity</label><input type="number" className="field-input" value={sectionForm.max_capacity || 40} onChange={e => setSectionForm({ ...sectionForm, max_capacity: e.target.value })} /></div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowSectionModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSaveSection} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
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
