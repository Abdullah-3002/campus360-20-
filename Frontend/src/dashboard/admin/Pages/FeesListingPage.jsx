import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listFeeStructures, listChallans, listScholarships, createFeeStructure, generateChallan, recordPayment } from '../../../services/feesService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate, getStatusBadgeClass } from '../../shared/helpers';
import { PlusIcon, FileIcon, XIcon } from '../../Icons';

const FeesListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [activeTab, setActiveTab] = useState('structures');
    const [structures, setStructures] = useState([]);
    const [challans, setChallans] = useState([]);
    const [scholarships, setScholarships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [s, c, sch] = await Promise.all([listFeeStructures(token), listChallans(token), listScholarships(token)]);
            setStructures(normalizeList(s));
            setChallans(normalizeList(c));
            setScholarships(normalizeList(sch));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const currentData = activeTab === 'structures' ? structures : activeTab === 'challans' ? challans : scholarships;
    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(currentData, ['fee_type', 'student_reg', 'scholarship_name']);

    const openCreate = () => {
        if (activeTab === 'structures') setFormData({ fee_type: '', amount: '', program: '' });
        else if (activeTab === 'challans') setFormData({ student: '', fee_structure: '', due_date: '' });
        else setFormData({ student: '', amount: '', reason: '' });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            if (activeTab === 'structures') await createFeeStructure(formData, token);
            else if (activeTab === 'challans') await generateChallan(formData, token);
            else await recordPayment(formData, token);
            showToast('Record saved');
            setShowModal(false);
            load();
        } catch (e) { alert(e.response?.data?.error || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    if (loading) return <LoadingSpinner message="Loading fees..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > FEES" title="Fees Management" />
            <div className="application-tabs">
                {['structures', 'challans', 'scholarships'].map(tab => (
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
                    {activeTab !== 'scholarships' && (
                        <button className="btn-add" onClick={openCreate}><PlusIcon /> <span>Add New</span></button>
                    )}
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {activeTab === 'structures' && <><th>Sr#</th><th>Fee Type</th><th>Amount</th><th>Program</th></>}
                                {activeTab === 'challans' && <><th>Sr#</th><th>Student</th><th>Amount</th><th>Due Date</th><th>Status</th></>}
                                {activeTab === 'scholarships' && <><th>Sr#</th><th>Student</th><th>Amount</th><th>Reason</th><th>Status</th></>}
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <EmptyRow colSpan={5} icon={<FileIcon />} title="No records found" />
                            ) : paginated.map((item, i) => (
                                <tr key={i}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    {activeTab === 'structures' && <><td>{item.fee_type}</td><td>{item.amount}</td><td>{item.program_name || '—'}</td></>}
                                    {activeTab === 'challans' && <><td>{item.student_reg || '—'}</td><td>{item.amount}</td><td>{formatDate(item.due_date)}</td><td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'PENDING'}</span></td></>}
                                    {activeTab === 'scholarships' && <><td>{item.student_reg || '—'}</td><td>{item.amount}</td><td>{item.reason || '—'}</td><td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase() || 'ACTIVE'}</span></td></>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && <TablePagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-modal">
                        <div className="modal-header"><h3>Add {activeTab.slice(0, -1)}</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            {activeTab === 'structures' && (<>
                                <div className="field-group"><label className="field-label">Fee Type</label><input className="field-input" value={formData.fee_type || ''} onChange={e => setFormData({ ...formData, fee_type: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Amount</label><input type="number" className="field-input" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
                            </>)}
                            {activeTab === 'challans' && (<>
                                <div className="field-group"><label className="field-label">Student ID</label><input type="number" className="field-input" value={formData.student || ''} onChange={e => setFormData({ ...formData, student: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Due Date</label><input type="date" className="field-input" value={formData.due_date || ''} onChange={e => setFormData({ ...formData, due_date: e.target.value })} /></div>
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

export default FeesListingPage;
