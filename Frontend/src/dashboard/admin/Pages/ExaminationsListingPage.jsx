import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listExaminations, createExamination, listResults, publishResult, approveResult } from '../../../services/examinationsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, FileTextIcon, XIcon } from '../../Icons';

const ExaminationsListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [activeTab, setActiveTab] = useState('exams');
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ exam_name: '', course: '', exam_type: '', total_marks: 100 });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [e, r] = await Promise.all([listExaminations(token), listResults(token)]);
            setExams(normalizeList(e));
            setResults(normalizeList(r));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const currentData = activeTab === 'exams' ? exams : results;
    const searchFields = activeTab === 'exams' ? ['exam_name', 'course_code'] : ['student_reg', 'semester_name'];
    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(currentData, searchFields);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await createExamination(formData, token);
            showToast('Examination created');
            setShowModal(false);
            load();
        } catch (e) { alert(e.response?.data?.error || 'Failed to create examination'); }
        finally { setSubmitting(false); }
    };

    const handlePublish = async (id) => {
        try { await publishResult(id, token); showToast('Result published'); load(); }
        catch (e) { alert('Failed to publish result'); }
    };

    const handleApprove = async (id) => {
        try { await approveResult(id, token); showToast('Result approved'); load(); }
        catch (e) { alert('Failed to approve result'); }
    };

    if (loading) return <LoadingSpinner message="Loading examinations..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > EXAMINATIONS" title="Examinations Management" />

            <div className="application-tabs">
                <button className={`app-tab ${activeTab === 'exams' ? 'active' : ''}`} onClick={() => { setActiveTab('exams'); setPage(1); }}>Examinations</button>
                <button className={`app-tab ${activeTab === 'results' ? 'active' : ''}`} onClick={() => { setActiveTab('results'); setPage(1); }}>Results</button>
            </div>

            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input type="text" placeholder="Search..." className="search-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    {activeTab === 'exams' && (
                        <button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> <span>Add Examination</span></button>
                    )}
                </div>
                <div className="data-table-wrapper">
                    {activeTab === 'exams' ? (
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Exam Name</th><th>Course</th><th>Type</th><th>Total Marks</th><th>Date</th></tr></thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={6} icon={<FileTextIcon />} title="No examinations found" />
                                ) : paginated.map((item, i) => (
                                    <tr key={item.exam_id || i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td>{item.exam_name}</td>
                                        <td>{item.course_code || '—'}</td>
                                        <td>{item.exam_type_name || '—'}</td>
                                        <td>{item.total_marks}</td>
                                        <td>{formatDate(item.exam_date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Student</th><th>Semester</th><th>CGPA</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={6} icon={<FileTextIcon />} title="No results found" />
                                ) : paginated.map((item, i) => (
                                    <tr key={item.result_id || i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td>{item.student_reg || '—'}</td>
                                        <td>{item.semester_name || '—'}</td>
                                        <td>{item.cgpa || '—'}</td>
                                        <td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'PENDING'}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="action-btn view-btn" onClick={() => handlePublish(item.result_id)}>Publish</button>
                                                <button className="action-btn" onClick={() => handleApprove(item.result_id)}>Approve</button>
                                            </div>
                                        </td>
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
                        <div className="modal-header"><h3>Add Examination</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group"><label className="field-label">Exam Name</label><input className="field-input" value={formData.exam_name} onChange={e => setFormData({ ...formData, exam_name: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Course ID</label><input type="number" className="field-input" value={formData.course} onChange={e => setFormData({ ...formData, course: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Exam Type ID</label><input type="number" className="field-input" value={formData.exam_type} onChange={e => setFormData({ ...formData, exam_type: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Total Marks</label><input type="number" className="field-input" value={formData.total_marks} onChange={e => setFormData({ ...formData, total_marks: e.target.value })} /></div>
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

export default ExaminationsListingPage;
