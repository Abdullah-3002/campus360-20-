import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listAttendance, listAttendanceSummaries } from '../../../services/attendanceService';
import { BASE_URL, getAuthHeader } from '../../../services/api';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, formatDate, getStatusBadgeClass } from '../../shared/helpers';
import { ClipboardIcon } from '../../Icons';

const AttendanceListingPage = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('records');
    const [records, setRecords] = useState([]);
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [r, s] = await Promise.all([listAttendance(token), listAttendanceSummaries(token)]);
                setRecords(normalizeList(r));
                setSummaries(normalizeList(s));
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (token) load();
    }, [token]);

    const currentData = activeTab === 'records' ? records : summaries;
    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(currentData, ['student_reg', 'section_name']);
    const exportReport = () => {
        fetch(`${BASE_URL}/attendance/summary/export/`, getAuthHeader(token))
            .then(r => r.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'attendance_report.csv';
                a.click();
            }).catch(() => alert('Export failed'));
    };

    if (loading) return <LoadingSpinner message="Loading attendance..." />;

    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > ATTENDANCE" title="Attendance Management" />
            <div className="application-tabs">
                <button className={`app-tab ${activeTab === 'records' ? 'active' : ''}`} onClick={() => { setActiveTab('records'); setPage(1); }}>Records</button>
                <button className={`app-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => { setActiveTab('summary'); setPage(1); }}>Summary Report</button>
            </div>
            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input type="text" placeholder="Search..." className="search-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    {activeTab === 'summary' && (
                        <button className="btn-secondary" onClick={exportReport}>Export CSV</button>
                    )}
                </div>
                <div className="data-table-wrapper">
                    {activeTab === 'records' ? (
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Student</th><th>Section</th><th>Date</th><th>Status</th></tr></thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={5} icon={<ClipboardIcon size={20} />} title="No attendance records" />
                                ) : paginated.map((item, i) => (
                                    <tr key={item.attendance_id || i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td>{item.student_reg || '—'}</td>
                                        <td>{item.section_name || '—'}</td>
                                        <td>{formatDate(item.date)}</td>
                                        <td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'PRESENT'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>Sr#</th><th>Student</th><th>Section</th><th>Present</th><th>Absent</th><th>Percentage</th></tr></thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <EmptyRow colSpan={6} icon={<ClipboardIcon size={20} />} title="No summary data" />
                                ) : paginated.map((item, i) => (
                                    <tr key={i}>
                                        <td>{(page - 1) * pageSize + i + 1}</td>
                                        <td>{item.student_reg || '—'}</td>
                                        <td>{item.section_name || '—'}</td>
                                        <td>{item.attended_lectures ?? '—'}</td>
                                        <td>{(item.total_lectures || 0) - (item.attended_lectures || 0)}</td>
                                        <td>{item.attendance_percentage != null ? `${Number(item.attendance_percentage).toFixed(1)}%` : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
        </div>
    );
};

export default AttendanceListingPage;
