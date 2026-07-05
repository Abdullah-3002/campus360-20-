import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
    listExaminations, createExamination, listResults, publishResult, approveResult,
    listExamTypes, addExamSchedule, listMarksEditRequests, reviewMarksEditRequest,
    generateSemesterResults,
} from '../../../services/examinationsService';
import { listSections } from '../../../services/sectionsService';
import { listSemesters } from '../../../services/academicsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, FileTextIcon, XIcon } from '../../Icons';

const ExaminationsListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [activeTab, setActiveTab] = useState('exams');
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [marksEditRequests, setMarksEditRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);
    const [reviewModal, setReviewModal] = useState(null);
    const [reviewForm, setReviewForm] = useState({ action: 'approve', review_notes: '', hours: 48 });
    const [formData, setFormData] = useState({
        exam_name: '', section: '', exam_type: '', total_marks: 100,
        exam_date: '', duration_minutes: 180, passing_marks: 50,
    });
    const [sections, setSections] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [genSemesterId, setGenSemesterId] = useState('');
    const [scheduleForm, setScheduleForm] = useState({
        exam_date: '', start_time: '09:00', end_time: '12:00', duration_minutes: 180,
        room_number: '', building_name: '', student_count: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [e, r, types, requests, sec, sem] = await Promise.all([
                listExaminations(token),
                listResults(token),
                listExamTypes(token),
                listMarksEditRequests(token, 'pending'),
                listSections(token, true),
                listSemesters(token),
            ]);
            setExams(normalizeList(e));
            setResults(normalizeList(r));
            setExamTypes(normalizeList(types));
            setMarksEditRequests(Array.isArray(requests) ? requests : normalizeList(requests));
            setSections(normalizeList(sec));
            setSemesters(normalizeList(sem));
            if (normalizeList(sem).length) setGenSemesterId(String(normalizeList(sem).find(s => s.is_current)?.semester_id || normalizeList(sem)[0].semester_id));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const currentData = activeTab === 'exams' ? exams : activeTab === 'results' ? results : marksEditRequests;
    const searchFields = activeTab === 'exams'
        ? ['exam_name', 'course_code']
        : activeTab === 'results'
            ? ['student_reg', 'semester_name']
            : ['student_reg', 'student_name', 'course_code', 'teacher_name'];
    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(currentData, searchFields);

    const handleSubmit = async () => {
        if (!formData.exam_name || !formData.section || !formData.exam_type || !formData.exam_date) {
            alert('Exam name, section, type, and date are required.');
            return;
        }
        const sec = sections.find(s => String(s.section_id) === String(formData.section));
        if (!sec) { alert('Invalid section'); return; }
        setSubmitting(true);
        try {
            await createExamination({
                exam_name: formData.exam_name,
                course: sec.course,
                semester: sec.semester,
                section: parseInt(formData.section, 10),
                exam_type: parseInt(formData.exam_type, 10),
                total_marks: parseFloat(formData.total_marks),
                passing_marks: parseFloat(formData.passing_marks),
                duration_minutes: parseInt(formData.duration_minutes, 10),
                exam_date: formData.exam_date,
            }, token);
            showToast('Examination created');
            setShowModal(false);
            load();
        } catch (e) { alert(e.response?.data?.error || JSON.stringify(e.response?.data) || 'Failed to create examination'); }
        finally { setSubmitting(false); }
    };

    const handleGenerateResults = async () => {
        if (!genSemesterId) { alert('Select a semester'); return; }
        try {
            await generateSemesterResults({ semester_id: parseInt(genSemesterId, 10) }, token);
            showToast('Results generated from final grades');
            load();
        } catch (e) { alert(e.response?.data?.error || 'Failed to generate results'); }
    };

    const openScheduleModal = (exam) => {
        setSelectedExam(exam);
        setScheduleForm({
            exam_date: exam.exam_date || new Date().toISOString().split('T')[0],
            start_time: '09:00', end_time: '12:00', duration_minutes: 180,
            room_number: '', building_name: '', student_count: '',
        });
        setShowScheduleModal(true);
    };

    const handleScheduleSubmit = async () => {
        if (!selectedExam || !scheduleForm.exam_date || !scheduleForm.room_number) {
            alert('Exam date and room number are required.');
            return;
        }
        setSubmitting(true);
        try {
            await addExamSchedule(selectedExam.exam_id, {
                ...scheduleForm,
                duration_minutes: parseInt(scheduleForm.duration_minutes, 10),
                student_count: scheduleForm.student_count ? parseInt(scheduleForm.student_count, 10) : null,
            }, token);
            showToast('Exam schedule added');
            setShowScheduleModal(false);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to add schedule');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePublish = async (id) => {
        try { await publishResult(id, token); showToast('Result published'); load(); }
        catch (e) { alert('Failed to publish result'); }
    };

    const handleApprove = async (id) => {
        try { await approveResult(id, token); showToast('Result approved'); load(); }
        catch (e) { alert('Failed to approve result'); }
    };

    const handleReviewRequest = async () => {
        if (!reviewModal) return;
        setSubmitting(true);
        try {
            await reviewMarksEditRequest(reviewModal.permission_id, {
                action: reviewForm.action,
                review_notes: reviewForm.review_notes,
                hours: parseInt(reviewForm.hours, 10) || 48,
            }, token);
            showToast(`Request ${reviewForm.action === 'approve' ? 'approved' : 'rejected'}`);
            setReviewModal(null);
            setReviewForm({ action: 'approve', review_notes: '', hours: 48 });
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to review request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner message="Loading examinations..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > EXAMINATIONS" title="Examinations Management" />

            <div className="application-tabs">
                <button className={`app-tab ${activeTab === 'exams' ? 'active' : ''}`} onClick={() => { setActiveTab('exams'); setPage(1); }}>Examinations</button>
                <button className={`app-tab ${activeTab === 'results' ? 'active' : ''}`} onClick={() => { setActiveTab('results'); setPage(1); }}>Results</button>
                <button className={`app-tab ${activeTab === 'marks-edit' ? 'active' : ''}`} onClick={() => { setActiveTab('marks-edit'); setPage(1); }}>
                    Marks Edit Requests {marksEditRequests.length > 0 && `(${marksEditRequests.length})`}
                </button>
            </div>

            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input type="text" placeholder="Search..." className="search-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    {activeTab === 'exams' && (
                        <button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> <span>Add Examination</span></button>
                    )}
                    {activeTab === 'results' && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <select className="field-input field-select" value={genSemesterId} onChange={e => setGenSemesterId(e.target.value)}>
                                {semesters.map(s => <option key={s.semester_id} value={s.semester_id}>{s.semester_name}</option>)}
                            </select>
                            <button className="btn-secondary" onClick={handleGenerateResults}>Generate Results</button>
                        </div>
                    )}
                </div>
                <div className="data-table-wrapper">
                    {activeTab === 'exams' ? (
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Exam Name</th><th>Course</th><th>Type</th><th>Total Marks</th><th>Date</th><th>Actions</th></tr></thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={7} icon={<FileTextIcon />} title="No examinations found" />
                                ) : paginated.map((item, i) => (
                                    <tr key={item.exam_id || i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td>{item.exam_name}</td>
                                        <td>{item.course_code || '—'}</td>
                                        <td>{item.exam_type_name || '—'}</td>
                                        <td>{item.total_marks}</td>
                                        <td>{formatDate(item.exam_date)}</td>
                                        <td>
                                            <button className="action-btn view-btn" onClick={() => openScheduleModal(item)}>Add Schedule</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeTab === 'results' ? (
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
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Student</th><th>Course</th><th>Section</th><th>Exam</th><th>Teacher</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={9} icon={<FileTextIcon />} title="No pending marks edit requests" />
                                ) : paginated.map((item, i) => (
                                    <tr key={item.permission_id || i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td><span className="app-number">{item.student_reg}</span><br /><small>{item.student_name}</small></td>
                                        <td>{item.course_code || '—'}</td>
                                        <td>{item.section_name || '—'}</td>
                                        <td>{item.exam_name || '—'}</td>
                                        <td>{item.teacher_name || '—'}</td>
                                        <td>{item.reason || '—'}</td>
                                        <td><span className={getStatusBadgeClass(item.request_status)}>{item.request_status?.toUpperCase()}</span></td>
                                        <td>
                                            <button className="action-btn view-btn" onClick={() => {
                                                setReviewModal(item);
                                                setReviewForm({ action: 'approve', review_notes: '', hours: 48 });
                                            }}>Review</button>
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
                            <div className="field-group">
                                <label className="field-label">Section</label>
                                <select className="field-input field-select" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })}>
                                    <option value="">Select section</option>
                                    {sections.map(s => (
                                        <option key={s.section_id} value={s.section_id}>{s.course_code} {s.section_name} — {s.faculty_name || 'No teacher'}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field-group">
                                <label className="field-label">Exam Type</label>
                                <select className="field-input field-select" value={formData.exam_type} onChange={e => setFormData({ ...formData, exam_type: e.target.value })}>
                                    <option value="">Select exam type</option>
                                    {examTypes.map(t => (
                                        <option key={t.exam_type_id} value={t.exam_type_id}>{t.type_name} ({t.weightage_percentage}%)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="two-column-grid">
                                <div className="field-group"><label className="field-label">Exam Date</label><input type="date" className="field-input" value={formData.exam_date} onChange={e => setFormData({ ...formData, exam_date: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Duration (min)</label><input type="number" className="field-input" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Total Marks</label><input type="number" className="field-input" value={formData.total_marks} onChange={e => setFormData({ ...formData, total_marks: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Passing Marks</label><input type="number" className="field-input" value={formData.passing_marks} onChange={e => setFormData({ ...formData, passing_marks: e.target.value })} /></div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showScheduleModal && selectedExam && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header">
                            <h3>Exam Schedule — {selectedExam.exam_name}</h3>
                            <button className="close-btn" onClick={() => setShowScheduleModal(false)}><XIcon /></button>
                        </div>
                        <div className="modal-body">
                            <div className="two-column-grid">
                                <div className="field-group"><label className="field-label">Exam Date</label><input type="date" className="field-input" value={scheduleForm.exam_date} onChange={e => setScheduleForm({ ...scheduleForm, exam_date: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Room Number</label><input className="field-input" value={scheduleForm.room_number} onChange={e => setScheduleForm({ ...scheduleForm, room_number: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Start Time</label><input type="time" className="field-input" value={scheduleForm.start_time} onChange={e => setScheduleForm({ ...scheduleForm, start_time: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">End Time</label><input type="time" className="field-input" value={scheduleForm.end_time} onChange={e => setScheduleForm({ ...scheduleForm, end_time: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Duration (minutes)</label><input type="number" className="field-input" value={scheduleForm.duration_minutes} onChange={e => setScheduleForm({ ...scheduleForm, duration_minutes: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Building</label><input className="field-input" value={scheduleForm.building_name} onChange={e => setScheduleForm({ ...scheduleForm, building_name: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Student Count</label><input type="number" className="field-input" value={scheduleForm.student_count} onChange={e => setScheduleForm({ ...scheduleForm, student_count: e.target.value })} /></div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleScheduleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save Schedule'}</button>
                        </div>
                    </div>
                </div>
            )}

            {reviewModal && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header">
                            <h3>Review Marks Edit Request</h3>
                            <button className="close-btn" onClick={() => setReviewModal(null)}><XIcon /></button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Student:</strong> {reviewModal.student_reg} — {reviewModal.student_name}</p>
                            <p><strong>Course:</strong> {reviewModal.course_code} / {reviewModal.section_name}</p>
                            <p><strong>Exam:</strong> {reviewModal.exam_name || '—'}</p>
                            <p><strong>Reason:</strong> {reviewModal.reason || '—'}</p>
                            <div className="field-group">
                                <label className="field-label">Action</label>
                                <select className="field-input field-select" value={reviewForm.action} onChange={e => setReviewForm({ ...reviewForm, action: e.target.value })}>
                                    <option value="approve">Approve</option>
                                    <option value="reject">Reject</option>
                                </select>
                            </div>
                            {reviewForm.action === 'approve' && (
                                <div className="field-group">
                                    <label className="field-label">Unlock Hours</label>
                                    <input type="number" className="field-input" value={reviewForm.hours} onChange={e => setReviewForm({ ...reviewForm, hours: e.target.value })} />
                                </div>
                            )}
                            <div className="field-group">
                                <label className="field-label">Review Notes</label>
                                <textarea className="field-input field-textarea" value={reviewForm.review_notes} onChange={e => setReviewForm({ ...reviewForm, review_notes: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleReviewRequest} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Review'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExaminationsListingPage;
