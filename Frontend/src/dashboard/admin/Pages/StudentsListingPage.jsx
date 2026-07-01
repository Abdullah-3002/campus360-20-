import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listStudents, getStudent } from '../../../services/studentsService';
import { listDepartments, listPrograms } from '../../../services/academicsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, getStatusBadgeClass } from '../../shared/helpers';
import { UserIcon, XIcon } from '../../Icons';

const StudentsListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [count, setCount] = useState(0);
    const [departments, setDepartments] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedProgram, setSelectedProgram] = useState('');
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const buildParams = () => {
        const p = new URLSearchParams();
        if (selectedDept) p.set('department', selectedDept);
        if (selectedProgram) p.set('program', selectedProgram);
        const qs = p.toString();
        return qs ? `?${qs}` : '';
    };

    const load = async () => {
        setLoading(true);
        try {
            const data = await listStudents(token, buildParams());
            setItems(Array.isArray(data.students) ? data.students : normalizeList(data));
            setCount(data.count ?? (Array.isArray(data.students) ? data.students.length : 0));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (!token) return;
        listDepartments(token).then(d => setDepartments(normalizeList(d))).catch(console.error);
    }, [token]);

    useEffect(() => {
        if (!token || !selectedDept) { setPrograms([]); return; }
        listPrograms(token, selectedDept).then(d => setPrograms(normalizeList(d))).catch(console.error);
    }, [token, selectedDept]);

    useEffect(() => { if (token) load(); }, [token, selectedDept, selectedProgram]);

    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } =
        useTableFilter(items, ['registration_number', 'username', 'program_name']);

    const openDetail = async (student) => {
        setDetailLoading(true);
        try {
            const d = await getStudent(student.student_id, token);
            setDetail(d);
        } catch (e) {
            showToast('Failed to load student details', 'error');
        } finally {
            setDetailLoading(false);
        }
    };

    if (loading) return <LoadingSpinner message="Loading students..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > STUDENTS" title="Students Management" />

            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <select className="field-input field-select" value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setSelectedProgram(''); setPage(1); }}>
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                </select>
                <select className="field-input field-select" value={selectedProgram} onChange={e => { setSelectedProgram(e.target.value); setPage(1); }} disabled={!selectedDept}>
                    <option value="">All Programs</option>
                    {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
                </select>
                <div className="stat-pill" style={{ alignSelf: 'center', padding: '8px 16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    Strength: <strong>{count}</strong>
                </div>
            </div>

            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input type="text" placeholder="Search students..." className="search-input" value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr><th>Sr#</th><th>Reg No</th><th>Name</th><th>Program</th><th>Semester</th><th>Batch</th><th>Status</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <EmptyRow colSpan={8} icon={<UserIcon size={20} />} title="No students found" />
                            ) : paginated.map((item, i) => (
                                <tr key={item.student_id}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    <td><span className="app-number">{item.registration_number}</span></td>
                                    <td>{item.username || '—'}</td>
                                    <td>{item.program_name || '—'}</td>
                                    <td>{item.current_semester || 1}</td>
                                    <td>{item.batch_year || '—'}</td>
                                    <td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'ACTIVE'}</span></td>
                                    <td><button className="action-btn" onClick={() => openDetail(item)}>View</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>

            {(detail || detailLoading) && (
                <div className="modal-overlay" onClick={() => setDetail(null)}>
                    <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3>Student Details</h3>
                            <button className="close-btn" onClick={() => setDetail(null)}><XIcon /></button>
                        </div>
                        <div className="modal-body">
                            {detailLoading ? <LoadingSpinner message="Loading..." /> : detail ? (
                                <>
                                    <p><strong>Registration:</strong> {detail.registration_number}</p>
                                    <p><strong>Name:</strong> {detail.username}</p>
                                    <p><strong>Program:</strong> {detail.program_name}</p>
                                    <p><strong>Semester:</strong> {detail.current_semester}</p>
                                    <p><strong>Batch:</strong> {detail.batch_year}</p>
                                    {detail.applicant_profile && (<>
                                        <h4 style={{ marginTop: '16px' }}>Applicant Profile</h4>
                                        <p>{detail.applicant_profile.first_name} {detail.applicant_profile.last_name} — {detail.applicant_profile.email}</p>
                                    </>)}
                                    {detail.applicant_documents?.length > 0 && (<>
                                        <h4 style={{ marginTop: '16px' }}>Submitted Documents</h4>
                                        <ul>{detail.applicant_documents.map(d => (
                                            <li key={d.document_id}>{d.document_type_display || d.document_type}: {d.file_name}</li>
                                        ))}</ul>
                                    </>)}
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsListingPage;
