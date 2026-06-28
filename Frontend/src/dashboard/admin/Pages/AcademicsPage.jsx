import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listDepartments, listPrograms, listCourses, listSemesters, createDepartment, createProgram, createCourse, createSemester } from '../../../services/academicsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate } from '../../shared/helpers';
import { PlusIcon, BookIcon, XIcon, CheckIcon } from '../../Icons';

const AcademicsPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [activeTab, setActiveTab] = useState('departments');
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const loadData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [d, p, c, s] = await Promise.all([
                listDepartments(token), listPrograms(token), listCourses(token), listSemesters(token)
            ]);
            setDepartments(normalizeList(d));
            setPrograms(normalizeList(p));
            setCourses(normalizeList(c));
            setSemesters(normalizeList(s));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [token]);

    const getCurrentData = () => {
        switch (activeTab) {
            case 'departments': return departments;
            case 'programs': return programs;
            case 'courses': return courses;
            case 'semesters': return semesters;
            default: return [];
        }
    };

    const searchFields = {
        departments: ['department_name', 'department_code'],
        programs: ['program_name', 'program_code'],
        courses: ['course_name', 'course_code'],
        semesters: ['semester_name'],
    };

    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(getCurrentData(), searchFields[activeTab] || []);

    const openCreate = () => {
        const defaults = {
            departments: { department_name: '', department_code: '', description: '' },
            programs: { program_name: '', program_code: '', department: '', duration_years: 4 },
            courses: { course_name: '', course_code: '', credit_hours: 3, course_type: 'core' },
            semesters: { semester_name: '', start_date: '', end_date: '', is_current: false },
        };
        setFormData(defaults[activeTab] || {});
        setShowModal(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            if (activeTab === 'departments') await createDepartment(formData, token);
            else if (activeTab === 'programs') await createProgram(formData, token);
            else if (activeTab === 'courses') await createCourse(formData, token);
            else if (activeTab === 'semesters') await createSemester(formData, token);
            showToast('Record created successfully');
            setShowModal(false);
            loadData();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to create record');
        } finally {
            setSubmitting(false);
        }
    };

    const renderRow = (item, index) => {
        switch (activeTab) {
            case 'departments':
                return (<tr key={item.department_id || index}><td>{index + 1}</td><td>{item.department_code}</td><td>{item.department_name}</td><td>{item.description || '—'}</td></tr>);
            case 'programs':
                return (<tr key={item.program_id || index}><td>{index + 1}</td><td>{item.program_code}</td><td>{item.program_name}</td><td>{item.duration_years || '—'}</td></tr>);
            case 'courses':
                return (<tr key={item.course_id || index}><td>{index + 1}</td><td>{item.course_code}</td><td>{item.course_name}</td><td>{item.credit_hours}</td><td>{item.course_type}</td></tr>);
            case 'semesters':
                return (<tr key={item.semester_id || index}><td>{index + 1}</td><td>{item.semester_name}</td><td>{formatDate(item.start_date)}</td><td>{formatDate(item.end_date)}</td><td>{item.is_current ? 'Yes' : 'No'}</td></tr>);
            default: return null;
        }
    };

    const headers = {
        departments: ['Sr#', 'Code', 'Name', 'Description'],
        programs: ['Sr#', 'Code', 'Name', 'Duration'],
        courses: ['Sr#', 'Code', 'Name', 'Credits', 'Type'],
        semesters: ['Sr#', 'Name', 'Start', 'End', 'Current'],
    };

    if (loading) return <LoadingSpinner message="Loading academics..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > ACADEMICS" title="Academics Management" />

            <div className="application-tabs">
                {['departments', 'programs', 'courses', 'semesters'].map(tab => (
                    <button key={tab} className={`app-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); setPage(1); }}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input type="text" placeholder="Search..." className="search-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <button className="btn-add" onClick={openCreate}><PlusIcon /> <span>Add New</span></button>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr>{headers[activeTab].map(h => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <EmptyRow colSpan={headers[activeTab].length} icon={<BookIcon size={20} />} title="No records found" subtitle='Click "Add New" to create one.' />
                            ) : paginated.map((item, i) => renderRow(item, (page - 1) * pageSize + i))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header">
                            <h3>Add {activeTab.slice(0, -1)}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button>
                        </div>
                        <div className="modal-body">
                            {activeTab === 'departments' && (<>
                                <div className="field-group"><label className="field-label">Department Name</label><input className="field-input" value={formData.department_name || ''} onChange={e => setFormData({ ...formData, department_name: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Department Code</label><input className="field-input" value={formData.department_code || ''} onChange={e => setFormData({ ...formData, department_code: e.target.value })} /></div>
                            </>)}
                            {activeTab === 'programs' && (<>
                                <div className="field-group"><label className="field-label">Program Name</label><input className="field-input" value={formData.program_name || ''} onChange={e => setFormData({ ...formData, program_name: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Program Code</label><input className="field-input" value={formData.program_code || ''} onChange={e => setFormData({ ...formData, program_code: e.target.value })} /></div>
                            </>)}
                            {activeTab === 'courses' && (<>
                                <div className="field-group"><label className="field-label">Course Name</label><input className="field-input" value={formData.course_name || ''} onChange={e => setFormData({ ...formData, course_name: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Course Code</label><input className="field-input" value={formData.course_code || ''} onChange={e => setFormData({ ...formData, course_code: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Credit Hours</label><input type="number" className="field-input" value={formData.credit_hours || 3} onChange={e => setFormData({ ...formData, credit_hours: e.target.value })} /></div>
                            </>)}
                            {activeTab === 'semesters' && (<>
                                <div className="field-group"><label className="field-label">Semester Name</label><input className="field-input" value={formData.semester_name || ''} onChange={e => setFormData({ ...formData, semester_name: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Start Date</label><input type="date" className="field-input" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">End Date</label><input type="date" className="field-input" value={formData.end_date || ''} onChange={e => setFormData({ ...formData, end_date: e.target.value })} /></div>
                            </>)}
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

export default AcademicsPage;
