import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listAuditLogs } from '../../../services/auditService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, formatDate } from '../../shared/helpers';
import { FileTextIcon } from '../../Icons';

const AuditLogPage = () => {
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableFilter, setTableFilter] = useState('');

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        listAuditLogs(token, tableFilter).then(d => setItems(normalizeList(d))).catch(console.error).finally(() => setLoading(false));
    }, [token, tableFilter]);

    const { paginated, filtered, page, setPage, totalPages, pageSize } = useTableFilter(items, ['action_type', 'table_name', 'username']);

    if (loading) return <LoadingSpinner message="Loading audit logs..." />;

    return (
        <div className="page-container fade-in">
            <PageHeader breadcrumb="DASHBOARD > AUDIT LOG" title="Audit Log" />
            <div className="form-card">
                <div className="table-toolbar">
                    <select className="field-input field-select" style={{ maxWidth: 220 }} value={tableFilter} onChange={e => setTableFilter(e.target.value)}>
                        <option value="">All tables</option>
                        {['section', 'result', 'semester', 'payment', 'marks_edit_permission'].map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>When</th><th>User</th><th>Action</th><th>Table</th><th>Record</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <EmptyRow colSpan={6} icon={<FileTextIcon />} title="No audit entries" />
                            ) : paginated.map((item, i) => (
                                <tr key={item.log_id || i}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    <td>{formatDate(item.created_at)}</td>
                                    <td>{item.username || '—'}</td>
                                    <td>{item.action_type}</td>
                                    <td>{item.table_name}</td>
                                    <td>{item.record_id ?? '—'}</td>
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

export default AuditLogPage;
