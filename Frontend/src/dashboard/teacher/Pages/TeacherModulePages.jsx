import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getMySections, getSectionStudents, submitFinalMarks } from '../../../services/sectionsService';
import { listExaminations, enterMarks, listMarks } from '../../../services/examinationsService';
import { listAttendance, markAttendance, nextLectureNumber, teacherLeaves, reviewLeave } from '../../../services/attendanceService';
import { listNotifications, listAnnouncements, createAnnouncement, getAnnouncementTargetOptions } from '../../../services/notificationsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, BookIcon, ClipboardIcon, FileIcon, BellIcon, XIcon } from '../../Icons';

export const TeacherSectionsPage = () => {
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { if (token) getMySections(token).then(d => setItems(normalizeList(d))).catch(console.error).finally(() => setLoading(false)); }, [token]);
    const { paginated, filtered, page, setPage, totalPages, pageSize } = useTableFilter(items, ['section_name', 'course_code']);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > SECTIONS" title="My Sections" />
            <div className="form-card">
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Section</th><th>Course</th><th>Capacity</th><th>Status</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={5} icon={<BookIcon size={20} />} title="No sections assigned" /> : paginated.map((item, i) => (
                                <tr key={i}><td>{(page-1)*pageSize+i+1}</td><td>{item.section_name}</td><td>{item.course_code || '—'}</td><td>{item.capacity}</td><td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'ACTIVE'}</span></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
        </div>
    );
};

export const TeacherAttendancePage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [lectureNumber, setLectureNumber] = useState(1);
    const [topicCovered, setTopicCovered] = useState('');
    const [students, setStudents] = useState([]);
    const [studentStatuses, setStudentStatuses] = useState({}); // { student_id: 'present' | 'absent' | 'leave' }
    const [fetchingStudents, setFetchingStudents] = useState(false);

    const load = () => listAttendance(token).then(d => setItems(normalizeList(d)));

    useEffect(() => {
        if (token) {
            load().finally(() => setLoading(false));
            getMySections(token).then(d => {
                const list = normalizeList(d);
                setSections(list);
                if (list.length > 0) setSelectedSection(list[0].section_id);
            }).catch(console.error);
        }
    }, [token]);

    useEffect(() => {
        if (showModal && selectedSection) {
            fetchSectionStudents(selectedSection);
            nextLectureNumber(selectedSection, token).then(d => {
                if (d?.lecture_number) setLectureNumber(d.lecture_number);
            }).catch(() => {});
        }
    }, [showModal, selectedSection, token]);

    const fetchSectionStudents = async (secId) => {
        if (!secId) return;
        setFetchingStudents(true);
        try {
            const list = await getSectionStudents(secId, token);
            setStudents(Array.isArray(list) ? list : []);
            const initialMap = {};
            (Array.isArray(list) ? list : []).forEach(s => { initialMap[s.student_id] = 'present'; });
            setStudentStatuses(initialMap);
        } catch (e) {
            console.error(e);
        } finally {
            setFetchingStudents(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setStudentStatuses(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSubmit = async () => {
        if (!selectedSection || !attendanceDate) {
            alert('Section and date are required.');
            return;
        }
        const records = Object.keys(studentStatuses).map(stId => ({
            student: parseInt(stId),
            status: studentStatuses[stId],
            remarks: ''
        }));
        
        try {
            await markAttendance({
                section_id: parseInt(selectedSection, 10),
                attendance_date: attendanceDate,
                lecture_number: lectureNumber,
                topic_covered: topicCovered,
                records: records
            }, token);
            showToast('Attendance marked successfully!');
            setShowModal(false);
            load();
        } catch (e) {
            alert(e.response?.data?.error || e.message || 'Failed to mark attendance');
        }
    };

    const { paginated, filtered, page, setPage, totalPages, pageSize } = useTableFilter(items, ['section_name', 'topic_covered']);

    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > ATTENDANCE" title="Attendance Management" />
            <div className="form-card">
                <div className="table-toolbar">
                    <button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> Mark Class Attendance</button>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Section / Course</th><th>Date</th><th>Lec#</th><th>Topic Covered</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={5} icon={<ClipboardIcon size={20} />} title="No attendance sessions marked yet" /> : paginated.map((item, i) => (
                                <tr key={i}>
                                    <td>{(page-1)*pageSize+i+1}</td>
                                    <td>{item.section_name || item.course_code || 'Section'}</td>
                                    <td>{formatDate(item.attendance_date || item.date)}</td>
                                    <td>{item.lecture_number || '1'}</td>
                                    <td>{item.topic_covered || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-modal" style={{ maxWidth: '700px', width: '90%' }}>
                        <div className="modal-header">
                            <h3>Mark Session Attendance</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                            <div className="two-column-grid" style={{ marginBottom: '16px' }}>
                                <div className="field-group">
                                    <label className="field-label">Course Section</label>
                                    <select className="field-input field-select" value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
                                        {sections.map(s => <option key={s.section_id} value={s.section_id}>{s.course_code} - {s.section_name}</option>)}
                                    </select>
                                </div>
                                <div className="field-group">
                                    <label className="field-label">Attendance Date</label>
                                    <input type="date" className="field-input" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                                </div>
                                <div className="field-group">
                                    <label className="field-label">Lecture Number</label>
                                    <input type="number" className="field-input" value={lectureNumber} onChange={e => setLectureNumber(parseInt(e.target.value) || 1)} />
                                </div>
                                <div className="field-group">
                                    <label className="field-label">Topic Covered</label>
                                    <input type="text" className="field-input" placeholder="e.g. Introduction to React" value={topicCovered} onChange={e => setTopicCovered(e.target.value)} />
                                </div>
                            </div>

                            <h4 style={{ margin: '16px 0 8px 0', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>Enrolled Students Attendance Status</h4>

                            {fetchingStudents ? (
                                <LoadingSpinner message="Loading enrolled students..." />
                            ) : students.length === 0 ? (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No registered students found in this section.</p>
                            ) : (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead><tr><th>Reg #</th><th>Student Name</th><th>Status (Radio)</th></tr></thead>
                                        <tbody>
                                            {students.map(std => (
                                                <tr key={std.student_id}>
                                                    <td>{std.registration_number}</td>
                                                    <td>{std.username}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '12px' }}>
                                                            <label style={{ cursor: 'pointer', color: 'green', fontWeight: 'bold' }}>
                                                                <input type="radio" name={`status_${std.student_id}`} value="present" checked={studentStatuses[std.student_id] === 'present'} onChange={() => handleStatusChange(std.student_id, 'present')} /> Present
                                                            </label>
                                                            <label style={{ cursor: 'pointer', color: 'red', fontWeight: 'bold' }}>
                                                                <input type="radio" name={`status_${std.student_id}`} value="absent" checked={studentStatuses[std.student_id] === 'absent'} onChange={() => handleStatusChange(std.student_id, 'absent')} /> Absent
                                                            </label>
                                                            <label style={{ cursor: 'pointer', color: 'orange', fontWeight: 'bold' }}>
                                                                <input type="radio" name={`status_${std.student_id}`} value="leave" checked={studentStatuses[std.student_id] === 'leave'} onChange={() => handleStatusChange(std.student_id, 'leave')} /> Leave
                                                            </label>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSubmit}>Submit Attendance</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const TeacherExaminationsPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedExam, setSelectedExam] = useState(null);
    const [marks, setMarks] = useState([]);
    const [students, setStudents] = useState([]);
    const [marksForm, setMarksForm] = useState({});
    const [showMarksModal, setShowMarksModal] = useState(false);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            listExaminations(token).then(d => setItems(normalizeList(d))),
            getMySections(token).then(d => setSections(normalizeList(d))),
        ]).finally(() => setLoading(false));
    }, [token]);

    const openMarks = async (exam) => {
        setSelectedExam(exam);
        setShowMarksModal(true);
        try {
            const [marksData, secStudents] = await Promise.all([
                listMarks(exam.exam_id, token),
                exam.section ? getSectionStudents(exam.section, token) : Promise.resolve([]),
            ]);
            const markList = normalizeList(marksData);
            setMarks(markList);
            setStudents(Array.isArray(secStudents) ? secStudents : []);
            const form = {};
            (Array.isArray(secStudents) ? secStudents : []).forEach(s => {
                const existing = markList.find(m => m.student === s.student_id);
                form[s.student_id] = existing?.obtained_marks ?? '';
            });
            setMarksForm(form);
        } catch (e) {
            alert('Failed to load marks');
        }
    };

    const saveMarks = async () => {
        if (!selectedExam) return;
        const entries = Object.keys(marksForm).map(stId => ({
            student: parseInt(stId, 10),
            obtained_marks: marksForm[stId] === '' ? null : parseFloat(marksForm[stId]),
            is_absent: marksForm[stId] === '',
        }));
        try {
            await enterMarks(selectedExam.exam_id, { marks: entries }, token);
            showToast('Marks saved');
            setShowMarksModal(false);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to save marks');
        }
    };

    const handleSubmitFinal = async (sectionId) => {
        if (!confirm('Submit final marks? This will lock the section and compute final grades.')) return;
        try {
            await submitFinalMarks(sectionId, token);
            showToast('Final marks submitted. Section locked.');
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to submit final marks');
        }
    };

    const { paginated, filtered, page, setPage, totalPages, pageSize } = useTableFilter(items, ['exam_name']);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > EXAMINATIONS" title="Examinations & Marks" />
            <div className="form-card">
                {sections.length > 0 && (
                    <div className="table-toolbar">
                        {sections.filter(s => s.is_active && !s.marks_locked).map(s => (
                            <button key={s.section_id} className="btn-secondary" style={{ marginRight: '8px' }} onClick={() => handleSubmitFinal(s.section_id)}>
                                Submit Final — {s.course_code} {s.section_name}
                            </button>
                        ))}
                    </div>
                )}
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Exam</th><th>Course</th><th>Type</th><th>Total Marks</th><th>Action</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={6} icon={<FileIcon />} title="No examinations" /> : paginated.map((item, i) => (
                                <tr key={i}>
                                    <td>{(page-1)*pageSize+i+1}</td><td>{item.exam_name}</td><td>{item.course_code || '—'}</td><td>{item.exam_type_name || '—'}</td><td>{item.total_marks}</td>
                                    <td><button className="action-btn view-btn" onClick={() => openMarks(item)}>Enter Marks</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>

            {showMarksModal && selectedExam && (
                <div className="modal-overlay">
                    <div className="glass-modal" style={{ maxWidth: '650px', width: '90%' }}>
                        <div className="modal-header">
                            <h3>Enter Marks — {selectedExam.exam_name}</h3>
                            <button className="close-btn" onClick={() => setShowMarksModal(false)}><XIcon /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead><tr><th>Reg #</th><th>Student</th><th>Obtained Marks</th></tr></thead>
                                <tbody>
                                    {students.map(s => (
                                        <tr key={s.student_id}>
                                            <td>{s.registration_number}</td>
                                            <td>{s.username}</td>
                                            <td><input type="number" className="field-input" style={{ maxWidth: '100px' }} value={marksForm[s.student_id] ?? ''} onChange={e => setMarksForm({ ...marksForm, [s.student_id]: e.target.value })} placeholder="Absent if empty" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowMarksModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={saveMarks}>Save Marks</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const TeacherNotificationsPage = () => {
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { if (token) listNotifications(token).then(d => setItems(normalizeList(d))).catch(console.error).finally(() => setLoading(false)); }, [token]);
    const { paginated, filtered, page, setPage, totalPages, pageSize } = useTableFilter(items, ['title']);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > NOTIFICATIONS" title="Notifications" />
            <div className="form-card">
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Title</th><th>Date</th><th>Read</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={4} icon={<BellIcon size={20} />} title="No notifications" /> : paginated.map((item, i) => (
                                <tr key={i}><td>{(page-1)*pageSize+i+1}</td><td>{item.title || item.subject || '—'}</td><td>{formatDate(item.created_at)}</td><td>{item.is_read ? 'Yes' : 'No'}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
        </div>
    );
};

export const TeacherLeavesPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [remarks, setRemarks] = useState({});

    const load = () => teacherLeaves(token).then(d => setItems(normalizeList(d)));
    useEffect(() => { if (token) load().finally(() => setLoading(false)); }, [token]);

    const handleReview = async (leaveId, action) => {
        const note = remarks[leaveId] || '';
        if (action === 'rejected' && !note.trim()) {
            alert('Remarks required when rejecting leave.');
            return;
        }
        try {
            await reviewLeave(leaveId, { action, teacher_remarks: note }, token);
            showToast(`Leave ${action}`);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to review leave');
        }
    };

    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > LEAVES" title="Student Leave Applications" />
            <div className="form-card">
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Student</th><th>Course</th><th>Dates</th><th>Reason</th><th>Action</th></tr></thead>
                        <tbody>
                            {items.length === 0 ? <EmptyRow colSpan={6} title="No pending leave requests" /> : items.map((item, i) => (
                                <tr key={item.leave_id}>
                                    <td>{i + 1}</td>
                                    <td>{item.student_name} ({item.student_reg})</td>
                                    <td>{item.course_code} — {item.section_name}</td>
                                    <td>{formatDate(item.start_date)} – {formatDate(item.end_date)}</td>
                                    <td>{item.reason}</td>
                                    <td>
                                        <input className="field-input" style={{ maxWidth: '120px', marginBottom: '4px' }} placeholder="Remarks" value={remarks[item.leave_id] || ''} onChange={e => setRemarks({ ...remarks, [item.leave_id]: e.target.value })} />
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn-verify" onClick={() => handleReview(item.leave_id, 'approved')}>Approve</button>
                                            <button className="action-btn danger" onClick={() => handleReview(item.leave_id, 'rejected')}>Reject</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const TeacherAnnouncementsPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', content: '', announcement_type: 'academic', target_audience_option: 'students' });

    const load = () => listAnnouncements(token).then(d => setItems(normalizeList(d)));
    useEffect(() => {
        if (!token) return;
        Promise.all([load(), getAnnouncementTargetOptions(token).then(setTargets).catch(() => [])]).finally(() => setLoading(false));
    }, [token]);

    const handleCreate = async () => {
        if (!form.title.trim() || !form.content.trim()) {
            alert('Title and content are required.');
            return;
        }
        try {
            await createAnnouncement(form, token);
            showToast('Announcement published');
            setShowModal(false);
            setForm({ title: '', content: '', announcement_type: 'academic', target_audience_option: 'students' });
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to create announcement');
        }
    };

    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > ANNOUNCEMENTS" title="Announcements" />
            <div className="form-card">
                <div className="table-toolbar">
                    <button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> New Announcement</button>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Title</th><th>Type</th><th>Date</th></tr></thead>
                        <tbody>
                            {items.length === 0 ? <EmptyRow colSpan={4} title="No announcements" /> : items.map((item, i) => (
                                <tr key={item.announcement_id || i}><td>{i + 1}</td><td>{item.title}</td><td>{item.announcement_type}</td><td>{formatDate(item.published_date || item.created_at)}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header"><h3>Create Announcement</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group"><label className="field-label">Title</label><input className="field-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Type</label>
                                <select className="field-input field-select" value={form.announcement_type} onChange={e => setForm({ ...form, announcement_type: e.target.value })}>
                                    <option value="academic">Academic</option>
                                    <option value="general">General</option>
                                </select>
                            </div>
                            <div className="field-group"><label className="field-label">Target Audience</label>
                                <select className="field-input field-select" value={form.target_audience_option} onChange={e => setForm({ ...form, target_audience_option: e.target.value })}>
                                    {(targets.length ? targets : [{ value: 'students', label: 'All Students' }]).map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field-group"><label className="field-label">Content</label><textarea className="field-input field-textarea" rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleCreate}>Publish</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
