import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { myEnrollments } from '../../../services/enrollmentsService';
import { myFinalGrades, myResults } from '../../../services/examinationsService';
import { myAttendanceSummary } from '../../../services/attendanceService';
import { myChallans } from '../../../services/feesService';
import { myComplaints, submitComplaint, listCategories } from '../../../services/complaintsService';
import { listNotifications, markNotificationRead } from '../../../services/notificationsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, BookIcon, FileIcon, BellIcon, XIcon } from '../../Icons';

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
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('grades');
    useEffect(() => {
        if (!token) return;
        Promise.all([myFinalGrades(token), myResults(token)]).then(([g, r]) => {
            setGrades(normalizeList(g)); setResults(normalizeList(r));
        }).catch(console.error).finally(() => setLoading(false));
    }, [token]);
    const data = tab === 'grades' ? grades : results;
    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(data, ['course_code']);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > GRADES" title="My Grades & Results" />
            <div className="application-tabs">
                <button className={`app-tab ${tab === 'grades' ? 'active' : ''}`} onClick={() => setTab('grades')}>Course Grades</button>
                <button className={`app-tab ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}>Semester Results</button>
            </div>
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
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!token) return;
        myAttendanceSummary(token).then(setSummary).catch(console.error).finally(() => setLoading(false));
    }, [token]);
    if (loading) return <LoadingSpinner />;
    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > ATTENDANCE" title="My Attendance" />
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-header"><div className="stat-info"><span className="stat-label">Present</span><h3 className="stat-value">{summary?.present_count ?? 0}</h3></div></div></div>
                <div className="stat-card"><div className="stat-header"><div className="stat-info"><span className="stat-label">Absent</span><h3 className="stat-value">{summary?.absent_count ?? 0}</h3></div></div></div>
                <div className="stat-card"><div className="stat-header"><div className="stat-info"><span className="stat-label">Percentage</span><h3 className="stat-value">{summary?.percentage != null ? `${summary.percentage}%` : '—'}</h3></div></div></div>
            </div>
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
                        <thead><tr><th>Sr#</th><th>Subject</th><th>Category</th><th>Date</th><th>Status</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? <EmptyRow colSpan={5} icon={<BellIcon size={20} />} title="No complaints" /> : paginated.map((item, i) => (
                                <tr key={item.complaint_id || i}><td>{(page-1)*pageSize+i+1}</td><td>{item.subject}</td><td>{item.category_name || '—'}</td><td>{formatDate(item.created_at || item.submitted_at)}</td><td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'OPEN'}</span></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
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
