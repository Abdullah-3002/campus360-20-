import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getMySections } from '../../../services/sectionsService';
import { listExaminations, enterMarks } from '../../../services/examinationsService';
import { listAttendance, markAttendance } from '../../../services/attendanceService';
import { listNotifications } from '../../../services/notificationsService';
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

    const fetchSectionStudents = async (secId) => {
        if (!secId) return;
        setFetchingStudents(true);
        try {
            const res = await fetch(`http://localhost:8000/api/sections/${secId}/students/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setStudents(list);
            const initialMap = {};
            list.forEach(s => { initialMap[s.student_id] = 'present'; });
            setStudentStatuses(initialMap);
        } catch (e) {
            console.error(e);
        } finally {
            setFetchingStudents(false);
        }
    };

    useEffect(() => {
        if (showModal && selectedSection) {
            fetchSectionStudents(selectedSection);
        }
    }, [showModal, selectedSection]);

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
            const res = await fetch('http://localhost:8000/api/attendance/mark/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    section_id: selectedSection,
                    attendance_date: attendanceDate,
                    lecture_number: lectureNumber,
                    topic_covered: topicCovered,
                    records: records
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to mark attendance');
            showToast('Attendance marked successfully!');
            setShowModal(false);
            load();
        } catch (e) {
            alert(e.message || 'Failed to mark attendance');
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
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { if (token) listExaminations(token).then(d => setItems(normalizeList(d))).catch(console.error).finally(() => setLoading(false)); }, [token]);
    const { paginated, filtered, page, setPage, totalPages, pageSize } = useTableFilter(items, ['exam_name']);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > EXAMINATIONS" title="Examinations" />
            <div className="form-card">
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Exam</th><th>Course</th><th>Type</th><th>Total Marks</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={5} icon={<FileIcon />} title="No examinations" /> : paginated.map((item, i) => (
                                <tr key={i}><td>{(page-1)*pageSize+i+1}</td><td>{item.exam_name}</td><td>{item.course_code || '—'}</td><td>{item.exam_type_name || '—'}</td><td>{item.total_marks}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
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
