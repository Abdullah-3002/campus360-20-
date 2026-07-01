import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { myEnrollments } from '../../../services/enrollmentsService';
import { myFinalGrades, myResults } from '../../../services/examinationsService';
import { myAttendanceSummary, submitLeave, myLeaves, deleteLeave } from '../../../services/attendanceService';
import { myChallans } from '../../../services/feesService';
import { myComplaints, submitComplaint, listCategories, deleteComplaint, getComplaint } from '../../../services/complaintsService';
import { listNotifications, markNotificationRead, listAnnouncements } from '../../../services/notificationsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, BookIcon, FileIcon, BellIcon, XIcon, TrashIcon } from '../../Icons';

export const MyEnrollmentsPage = () => {
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!token) return;
        myEnrollments(token).then(d => {
            const enrollments = normalizeList(d);
            const flat = enrollments.flatMap(e =>
                (e.course_registrations || []).map(r => ({
                    ...r,
                    semester_name: e.semester_name,
                }))
            );
            setItems(flat);
        }).catch(console.error).finally(() => setLoading(false));
    }, [token]);
    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(items, ['course_code', 'course_name']);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > ENROLLMENTS" title="My Enrollments" />
            <div className="form-card">
                <div className="table-toolbar"><div className="table-search search-bar" style={{ maxWidth: 360 }}><input className="search-input" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div></div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Course</th><th>Title</th><th>Section</th><th>Semester</th><th>Status</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={6} icon={<BookIcon size={20} />} title="No enrollments" /> : paginated.map((item, i) => (
                                <tr key={item.registration_id || i}><td>{(page-1)*pageSize+i+1}</td><td>{item.course_code || '—'}</td><td>{item.course_name || '—'}</td><td>{item.section_name || '—'}</td><td>{item.semester_name || '—'}</td><td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'ENROLLED'}</span></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
        </div>
    );
};

export const MyGradesPage = () => {
    const { token } = useAuth();
    const [grades, setGrades] = useState([]);
    const [results, setResults] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('grades');
    useEffect(() => {
        if (!token) return;
        Promise.all([myFinalGrades(token), myResults(token), myEnrollments(token)]).then(([g, r, e]) => {
            setGrades(normalizeList(g));
            setResults(normalizeList(r));
            const flat = normalizeList(e).flatMap(en => (en.course_registrations || []).map(reg => ({ ...reg, semester_name: en.semester_name })));
            setEnrollments(flat);
            if (flat.length > 0) setSelectedCourse(String(flat[0].course_id || flat[0].course_code || ''));
        }).catch(console.error).finally(() => setLoading(false));
    }, [token]);
    const filteredGrades = selectedCourse
        ? grades.filter(g => String(g.course_id || g.course_code) === selectedCourse || g.course_code === selectedCourse)
        : grades;
    const data = tab === 'grades' ? filteredGrades : results;
    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(data, ['course_code']);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > GRADES" title="My Grades & Results" />
            <div className="application-tabs">
                <button className={`app-tab ${tab === 'grades' ? 'active' : ''}`} onClick={() => setTab('grades')}>Course Grades</button>
                <button className={`app-tab ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}>Semester Results</button>
            </div>
            {tab === 'grades' && enrollments.length > 0 && (
                <div className="field-group" style={{ marginBottom: '12px', maxWidth: '320px' }}>
                    <label className="field-label">Filter by Course</label>
                    <select className="field-input field-select" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                        <option value="">All Courses</option>
                        {[...new Map(enrollments.map(e => [e.course_code, e])).values()].map(e => (
                            <option key={e.course_code} value={e.course_code}>{e.course_code} — {e.course_name}</option>
                        ))}
                    </select>
                </div>
            )}
            <div className="form-card">
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr>{tab === 'grades' ? <><th>Sr#</th><th>Course</th><th>Grade</th><th>Marks</th></> : <><th>Sr#</th><th>Semester</th><th>CGPA</th><th>Status</th></>}</tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={4} icon={<FileIcon />} title="No records" /> : paginated.map((item, i) => (
                                tab === 'grades' ? (
                                    <tr key={i}><td>{(page-1)*pageSize+i+1}</td><td>{item.course_code || '—'}</td><td>{item.grade_letter || '—'}</td><td>{item.total_marks ?? '—'}</td></tr>
                                ) : (
                                    <tr key={i}><td>{(page-1)*pageSize+i+1}</td><td>{item.semester_name || '—'}</td><td>{item.cgpa || '—'}</td><td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || '—'}</span></td></tr>
                                )
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
        </div>
    );
};

export const MyAttendancePage = () => {
    const { token } = useAuth();
    const [summaries, setSummaries] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            myAttendanceSummary(token),
            myEnrollments(token),
        ]).then(([att, en]) => {
            const list = Array.isArray(att) ? att : (att ? [att] : []);
            setSummaries(list);
            const flat = normalizeList(en).flatMap(e => (e.course_registrations || []).map(r => ({ ...r, semester_name: e.semester_name })));
            setEnrollments(flat);
            if (flat.length > 0) setSelectedCourse(String(flat[0].course_id || ''));
        }).catch(console.error).finally(() => setLoading(false));
    }, [token]);

    useEffect(() => {
        if (!token || !selectedCourse) return;
        myAttendanceSummary(token, selectedCourse).then(d => {
            setSummaries(Array.isArray(d) ? d : (d ? [d] : []));
        }).catch(console.error);
    }, [token, selectedCourse]);

    const current = summaries[0] || {};
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > ATTENDANCE" title="My Attendance" />
            {enrollments.length > 0 && (
                <div className="field-group" style={{ marginBottom: '16px', maxWidth: '320px' }}>
                    <label className="field-label">Select Subject</label>
                    <select className="field-input field-select" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                        {[...new Map(enrollments.map(e => [e.course_id, e])).values()].map(e => (
                            <option key={e.course_id} value={e.course_id}>{e.course_code} — {e.course_name}</option>
                        ))}
                    </select>
                </div>
            )}
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-header"><div className="stat-info"><span className="stat-label">Attended</span><h3 className="stat-value">{current.attended_lectures ?? 0}</h3></div></div></div>
                <div className="stat-card"><div className="stat-header"><div className="stat-info"><span className="stat-label">Total Lectures</span><h3 className="stat-value">{current.total_lectures ?? 0}</h3></div></div></div>
                <div className="stat-card"><div className="stat-header"><div className="stat-info"><span className="stat-label">Percentage</span><h3 className="stat-value">{current.attendance_percentage != null ? `${Number(current.attendance_percentage).toFixed(1)}%` : '—'}</h3></div></div></div>
                <div className="stat-card"><div className="stat-header"><div className="stat-info"><span className="stat-label">Leave Count</span><h3 className="stat-value">{current.leave_count ?? 0}</h3></div></div></div>
            </div>
            {summaries.length > 1 && (
                <div className="form-card" style={{ marginTop: '20px' }}>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Course</th><th>Attended</th><th>Total</th><th>%</th></tr></thead>
                            <tbody>
                                {summaries.map((s, i) => (
                                    <tr key={i}><td>{s.course_code}</td><td>{s.attended_lectures}</td><td>{s.total_lectures}</td><td>{Number(s.attendance_percentage).toFixed(1)}%</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export const MyFeesPage = () => {
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!token) return;
        myChallans(token).then(d => setItems(normalizeList(d))).catch(console.error).finally(() => setLoading(false));
    }, [token]);
    const { paginated, filtered, page, setPage, totalPages, pageSize } = useTableFilter(items, ['fee_type']);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > FEES" title="My Fee Challans" />
            <div className="form-card">
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Fee Type</th><th>Amount</th><th>Due Date</th><th>Status</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={5} icon={<FileIcon />} title="No challans" /> : paginated.map((item, i) => (
                                <tr key={i}><td>{(page-1)*pageSize+i+1}</td><td>{item.semester_name || 'Semester Fee'}</td><td>{item.amount ?? item.total_amount ?? '—'}</td><td>{formatDate(item.due_date)}</td><td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'PENDING'}</span></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
        </div>
    );
};

export const MyComplaintsPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [formData, setFormData] = useState({ subject: '', description: '', category: '' });
    const load = () => myComplaints(token).then(d => setItems(normalizeList(d)));
    useEffect(() => {
        if (!token) return;
        Promise.all([
            load(),
            listCategories(token).then(d => setCategories(normalizeList(d))).catch(() => []),
        ]).finally(() => setLoading(false));
    }, [token]);
    const { paginated, filtered, page, setPage, totalPages, pageSize } = useTableFilter(items, ['subject']);
    const handleDelete = async (id) => {
        if (!confirm('Delete this complaint?')) return;
        try {
            await deleteComplaint(id, token);
            showToast('Complaint deleted');
            if (selectedComplaint?.complaint_id === id) setSelectedComplaint(null);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to delete complaint');
        }
    };

    const handleView = async (item) => {
        try {
            const detail = await getComplaint(item.complaint_id, token);
            setSelectedComplaint(detail);
        } catch {
            setSelectedComplaint(item);
        }
    };

    const handleSubmit = async () => {
        if (!formData.subject.trim() || !formData.description.trim()) {
            alert('Please fill in subject and description.');
            return;
        }
        if (!formData.category) {
            alert('Please select a complaint category.');
            return;
        }
        try {
            await submitComplaint({
                subject: formData.subject,
                description: formData.description,
                category: parseInt(formData.category, 10),
            }, token);
            showToast('Complaint submitted');
            setShowModal(false);
            setFormData({ subject: '', description: '', category: '' });
            load();
        } catch (e) {
            const msg = e.response?.data?.category?.[0]
                || e.response?.data?.error
                || Object.values(e.response?.data || {}).flat().join(', ')
                || 'Failed to submit complaint';
            alert(msg);
        }
    };
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > COMPLAINTS" title="My Complaints" />
            <div className="form-card">
                <div className="table-toolbar"><button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> Submit Complaint</button></div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Subject</th><th>Category</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={6} icon={<BellIcon size={20} />} title="No complaints" /> : paginated.map((item, i) => (
                                <tr key={item.complaint_id || i} style={{ cursor: 'pointer' }} onClick={() => handleView(item)}>
                                    <td>{(page-1)*pageSize+i+1}</td><td>{item.subject}</td><td>{item.category_name || '—'}</td><td>{formatDate(item.created_at || item.submitted_at)}</td>
                                    <td><span className={getStatusBadgeClass(item.status)}>{item.status === 'in_progress' ? 'UNDER REVIEW' : item.status?.toUpperCase() || 'OPEN'}</span></td>
                                    <td onClick={e => e.stopPropagation()}>
                                        {item.status !== 'resolved' && (
                                            <button className="action-btn danger" onClick={() => handleDelete(item.complaint_id)}><TrashIcon /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
            {selectedComplaint && (
                <div className="modal-overlay"><div className="glass-modal">
                    <div className="modal-header"><h3>{selectedComplaint.subject}</h3><button className="close-btn" onClick={() => setSelectedComplaint(null)}><XIcon /></button></div>
                    <div className="modal-body">
                        <p><strong>Status:</strong> {selectedComplaint.status === 'in_progress' ? 'Under Review' : selectedComplaint.status}</p>
                        <p style={{ marginTop: '12px' }}><strong>Your Message:</strong></p>
                        <p style={{ color: 'var(--text-secondary)' }}>{selectedComplaint.description}</p>
                        {selectedComplaint.admin_response && (
                            <>
                                <p style={{ marginTop: '16px' }}><strong>Admin Response:</strong></p>
                                <p style={{ color: 'var(--text-secondary)', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>{selectedComplaint.admin_response}</p>
                            </>
                        )}
                    </div>
                </div></div>
            )}
            {showModal && (
                <div className="modal-overlay"><div className="glass-modal">
                    <div className="modal-header"><h3>Submit Complaint</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                    <div className="modal-body">
                        <div className="field-group"><label className="field-label">Subject</label><input className="field-input" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} /></div>
                        <div className="field-group"><label className="field-label">Description</label><textarea className="field-input field-textarea" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                        <div className="field-group"><label className="field-label">Category</label>
                            <select className="field-input field-select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                <option value="">Select category</option>
                                {categories.map(c => (
                                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                                ))}
                            </select>
                            {categories.length === 0 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                                    No categories found. Ask admin to run seed_erp_data.
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-primary" onClick={handleSubmit}>Submit</button></div>
                </div></div>
            )}
        </div>
    );
};

export const MyNotificationsPage = () => {
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const load = () => listNotifications(token).then(d => setItems(normalizeList(d)));
    useEffect(() => { if (token) load().finally(() => setLoading(false)); }, [token]);
    const { paginated, filtered, page, setPage, totalPages, pageSize } = useTableFilter(items, ['title']);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > NOTIFICATIONS" title="My Notifications" />
            <div className="form-card">
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Title</th><th>Date</th><th>Read</th><th>Action</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={5} icon={<BellIcon size={20} />} title="No notifications" /> : paginated.map((item, i) => (
                                <tr key={i}><td>{(page-1)*pageSize+i+1}</td><td>{item.title || item.subject || '—'}</td><td>{formatDate(item.created_at)}</td><td>{item.is_read ? 'Yes' : 'No'}</td>
                                    <td>{!item.is_read && <button className="action-btn view-btn" onClick={() => markNotificationRead(item.notification_id, token).then(load)}>Mark Read</button>}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
        </div>
    );
};

export const MyAnnouncementsPage = () => {
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!token) return;
        listAnnouncements(token).then(d => setItems(normalizeList(d))).catch(console.error).finally(() => setLoading(false));
    }, [token]);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > ANNOUNCEMENTS" title="Campus Announcements" />
            <div className="form-card">
                {items.length === 0 ? <EmptyRow colSpan={3} title="No announcements" /> : items.map((item, i) => (
                    <div key={item.announcement_id || i} style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                        <h4 style={{ margin: '0 0 8px' }}>{item.title}</h4>
                        <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px' }}>{item.content}</p>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{formatDate(item.published_date || item.created_at)} · {item.announcement_type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MyLeavesPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ section: '', start_date: '', end_date: '', reason: '' });

    const load = () => myLeaves(token).then(d => setItems(normalizeList(d)));
    useEffect(() => {
        if (!token) return;
        Promise.all([
            load(),
            myEnrollments(token).then(d => {
                const flat = normalizeList(d).flatMap(e => (e.course_registrations || []).map(r => ({ ...r, semester_name: e.semester_name })));
                setSections(flat.filter(r => r.section_id));
            }),
        ]).finally(() => setLoading(false));
    }, [token]);

    const handleSubmit = async () => {
        if (!form.section || !form.start_date || !form.end_date || !form.reason.trim()) {
            alert('All fields are required.');
            return;
        }
        try {
            await submitLeave({ section: parseInt(form.section, 10), start_date: form.start_date, end_date: form.end_date, reason: form.reason }, token);
            showToast('Leave application submitted');
            setShowModal(false);
            setForm({ section: '', start_date: '', end_date: '', reason: '' });
            load();
        } catch (e) {
            alert(e.response?.data?.error || Object.values(e.response?.data || {}).flat().join(', ') || 'Failed to submit leave');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this leave application?')) return;
        try {
            await deleteLeave(id, token);
            showToast('Leave deleted');
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to delete');
        }
    };

    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > LEAVES" title="Leave Applications" />
            <div className="form-card">
                <div className="table-toolbar"><button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> Apply for Leave</button></div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Course</th><th>Dates</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>
                            {items.length === 0 ? <EmptyRow colSpan={6} title="No leave applications" /> : items.map((item, i) => (
                                <tr key={item.leave_id}>
                                    <td>{i + 1}</td><td>{item.course_code} — {item.section_name}</td>
                                    <td>{formatDate(item.start_date)} – {formatDate(item.end_date)}</td>
                                    <td>{item.reason}</td>
                                    <td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase()}</span></td>
                                    <td>{item.status === 'pending' && <button className="action-btn danger" onClick={() => handleDelete(item.leave_id)}><TrashIcon /></button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {showModal && (
                <div className="modal-overlay"><div className="glass-modal">
                    <div className="modal-header"><h3>Apply for Leave</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                    <div className="modal-body">
                        <div className="field-group"><label className="field-label">Course Section</label>
                            <select className="field-input field-select" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}>
                                <option value="">Select section</option>
                                {sections.map(s => <option key={s.registration_id} value={s.section_id}>{s.course_code} — {s.section_name}</option>)}
                            </select>
                        </div>
                        <div className="two-column-grid">
                            <div className="field-group"><label className="field-label">Start Date</label><input type="date" className="field-input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">End Date</label><input type="date" className="field-input" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                        </div>
                        <div className="field-group"><label className="field-label">Reason</label><textarea className="field-input field-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
                    </div>
                    <div className="modal-footer"><button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-primary" onClick={handleSubmit}>Submit</button></div>
                </div></div>
            )}
        </div>
    );
};
