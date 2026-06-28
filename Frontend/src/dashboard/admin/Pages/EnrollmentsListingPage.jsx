import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listEnrollments } from '../../../services/enrollmentsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, getStatusBadgeClass } from '../../shared/helpers';
import { FileTextIcon } from '../../Icons';

const EnrollmentsListingPage = () => {
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try { setItems(normalizeList(await listEnrollments(token))); }
            catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (token) load();
    }, [token]);

    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(items, ['student_reg', 'course_code', 'registration_number']);

    if (loading) return <LoadingSpinner message="Loading enrollments..." />;

    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > ENROLLMENTS" title="Enrollments Management" />
            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input type="text" placeholder="Search enrollments..." className="search-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Student</th><th>Course</th><th>Section</th><th>Semester</th><th>Status</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <EmptyRow colSpan={6} icon={<FileTextIcon />} title="No enrollments found" />
                            ) : paginated.map((item, i) => (
                                <tr key={item.registration_id || i}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    <td>{item.student_reg || item.registration_number || '—'}</td>
                                    <td>{item.course_code || item.course?.course_code || '—'}</td>
                                    <td>{item.section_name || '—'}</td>
                                    <td>{item.semester_name || '—'}</td>
                                    <td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'ENROLLED'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>
        </div>
    );
};

export default EnrollmentsListingPage;
