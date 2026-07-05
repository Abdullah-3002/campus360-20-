import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
    listFeeStructures, listChallans, listScholarships, createFeeStructure, generateChallan,
    createScholarship, listPayments, verifyPayment, generateSemesterChallans, recordPayment,
} from '../../../services/feesService';
import { listSemesters } from '../../../services/academicsService';
import { listPrograms } from '../../../services/academicsService';
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
    const [payments, setPayments] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [bulkSemesterId, setBulkSemesterId] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [s, c, sch, p, prog, sem] = await Promise.all([
                listFeeStructures(token), listChallans(token), listScholarships(token),
                listPayments(token, 'false'), listPrograms(token), listSemesters(token),
            ]);
            setStructures(normalizeList(s));
            setChallans(normalizeList(c));
            setScholarships(normalizeList(sch));
            setPayments(normalizeList(p));
            setPrograms(normalizeList(prog));
            const semList = normalizeList(sem);
            setSemesters(semList);
            if (semList.length && !bulkSemesterId) setBulkSemesterId(String(semList.find(x => x.is_current)?.semester_id || semList[0].semester_id));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const currentData = activeTab === 'structures' ? structures : activeTab === 'challans' ? challans : activeTab === 'payments' ? payments : scholarships;
    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(currentData, ['fee_type', 'student_reg', 'scholarship_type', 'challan_number']);

    const openCreate = () => {
        if (activeTab === 'structures') setFormData({ fee_type: 'semester_fee', amount: '', program: '', semester_number: 1, effective_from: new Date().toISOString().split('T')[0] });
        else if (activeTab === 'challans') setFormData({ student: '', semester: bulkSemesterId, total_amount: '', due_date: '' });
        else if (activeTab === 'payments') setFormData({ challan: '', student: '', amount: '', payment_method: 'bank_challan', payment_time: '12:00' });
        else setFormData({ student: '', scholarship_type: 'merit', amount: '', start_date: new Date().toISOString().split('T')[0], remarks: '' });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            if (activeTab === 'structures') {
                await createFeeStructure({ ...formData, program: parseInt(formData.program, 10), amount: parseFloat(formData.amount), semester_number: parseInt(formData.semester_number, 10) }, token);
            } else if (activeTab === 'challans') {
                await generateChallan({ ...formData, student: parseInt(formData.student, 10), semester: parseInt(formData.semester, 10), total_amount: parseFloat(formData.total_amount) }, token);
            } else if (activeTab === 'payments') {
                await recordPayment({ ...formData, challan: parseInt(formData.challan, 10), student: parseInt(formData.student, 10), amount: parseFloat(formData.amount) }, token);
            } else {
                await createScholarship({ ...formData, student: parseInt(formData.student, 10), amount: parseFloat(formData.amount) }, token);
            }
            showToast('Record saved');
            setShowModal(false);
            load();
        } catch (e) { alert(e.response?.data?.error || JSON.stringify(e.response?.data) || 'Operation failed'); }
        finally { setSubmitting(false); }
    };

    const handleBulkChallans = async () => {
        try {
            const res = await generateSemesterChallans({ semester_id: parseInt(bulkSemesterId, 10) }, token);
            showToast(res.message || 'Challans generated');
            load();
        } catch (e) { alert(e.response?.data?.error || 'Failed'); }
    };

    const handleVerifyPayment = async (paymentId) => {
        try {
            await verifyPayment(paymentId, { remarks: 'Verified by admin' }, token);
            showToast('Payment verified');
            load();
        } catch (e) { alert(e.response?.data?.error || 'Failed to verify'); }
    };

    if (loading) return <LoadingSpinner message="Loading fees..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > FEES" title="Fees Management" />
            <div className="application-tabs">
                {['structures', 'challans', 'payments', 'scholarships'].map(tab => (
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
                    {activeTab === 'challans' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="field-input field-select" value={bulkSemesterId} onChange={e => setBulkSemesterId(e.target.value)}>
                                {semesters.map(s => <option key={s.semester_id} value={s.semester_id}>{s.semester_name}</option>)}
                            </select>
                            <button className="btn-secondary" onClick={handleBulkChallans}>Generate All Semester Challans</button>
                        </div>
                    )}
                    <button className="btn-add" onClick={openCreate}><PlusIcon /> <span>Add New</span></button>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {activeTab === 'structures' && <><th>Sr#</th><th>Fee Type</th><th>Amount</th><th>Program</th><th>Sem #</th></>}
                                {activeTab === 'challans' && <><th>Sr#</th><th>Student</th><th>Amount</th><th>Due Date</th><th>Status</th></>}
                                {activeTab === 'payments' && <><th>Sr#</th><th>Student</th><th>Challan</th><th>Amount</th><th>Verified</th><th>Action</th></>}
                                {activeTab === 'scholarships' && <><th>Sr#</th><th>Student</th><th>Type</th><th>Amount</th><th>Active</th></>}
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <EmptyRow colSpan={6} icon={<FileIcon />} title="No records found" />
                            ) : paginated.map((item, i) => (
                                <tr key={item.payment_id || item.challan_id || item.structure_id || item.scholarship_id || i}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    {activeTab === 'structures' && <><td>{item.fee_type}</td><td>{item.amount}</td><td>{item.program_name || '—'}</td><td>{item.semester_number || '—'}</td></>}
                                    {activeTab === 'challans' && <><td>{item.student_reg || '—'}</td><td>{item.total_amount}</td><td>{formatDate(item.due_date)}</td><td><span className={getStatusBadgeClass(item.status)}>{item.status?.toUpperCase()}</span></td></>}
                                    {activeTab === 'payments' && (
                                        <>
                                            <td>{item.student_reg || '—'}</td><td>{item.challan_number || '—'}</td><td>{item.amount}</td>
                                            <td>{item.is_verified ? 'Yes' : 'Pending'}</td>
                                            <td>{!item.is_verified && <button className="action-btn view-btn" onClick={() => handleVerifyPayment(item.payment_id)}>Verify</button>}</td>
                                        </>
                                    )}
                                    {activeTab === 'scholarships' && <><td>{item.student_reg || '—'}</td><td>{item.scholarship_type}</td><td>{item.amount || item.percentage || '—'}</td><td>{item.is_active ? 'Yes' : 'No'}</td></>}
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
                                <div className="field-group"><label className="field-label">Program</label>
                                    <select className="field-input field-select" value={formData.program || ''} onChange={e => setFormData({ ...formData, program: e.target.value })}>
                                        <option value="">Select</option>{programs.map(p => <option key={p.program_id} value={p.program_id}>{p.program_name}</option>)}
                                    </select>
                                </div>
                                <div className="field-group"><label className="field-label">Semester Number</label><input type="number" className="field-input" value={formData.semester_number || 1} onChange={e => setFormData({ ...formData, semester_number: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Amount</label><input type="number" className="field-input" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Effective From</label><input type="date" className="field-input" value={formData.effective_from || ''} onChange={e => setFormData({ ...formData, effective_from: e.target.value })} /></div>
                            </>)}
                            {activeTab === 'challans' && (<>
                                <div className="field-group"><label className="field-label">Student ID</label><input type="number" className="field-input" value={formData.student || ''} onChange={e => setFormData({ ...formData, student: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Semester</label>
                                    <select className="field-input field-select" value={formData.semester || ''} onChange={e => setFormData({ ...formData, semester: e.target.value })}>
                                        {semesters.map(s => <option key={s.semester_id} value={s.semester_id}>{s.semester_name}</option>)}
                                    </select>
                                </div>
                                <div className="field-group"><label className="field-label">Total Amount</label><input type="number" className="field-input" value={formData.total_amount || ''} onChange={e => setFormData({ ...formData, total_amount: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Due Date</label><input type="date" className="field-input" value={formData.due_date || ''} onChange={e => setFormData({ ...formData, due_date: e.target.value })} /></div>
                            </>)}
                            {activeTab === 'payments' && (<>
                                <div className="field-group"><label className="field-label">Challan ID</label><input type="number" className="field-input" value={formData.challan || ''} onChange={e => setFormData({ ...formData, challan: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Student ID</label><input type="number" className="field-input" value={formData.student || ''} onChange={e => setFormData({ ...formData, student: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Amount</label><input type="number" className="field-input" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
                            </>)}
                            {activeTab === 'scholarships' && (<>
                                <div className="field-group"><label className="field-label">Student ID</label><input type="number" className="field-input" value={formData.student || ''} onChange={e => setFormData({ ...formData, student: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Type</label>
                                    <select className="field-input field-select" value={formData.scholarship_type || 'merit'} onChange={e => setFormData({ ...formData, scholarship_type: e.target.value })}>
                                        {['merit', 'need_based', 'employee_child', 'minority', 'disability', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="field-group"><label className="field-label">Amount</label><input type="number" className="field-input" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
                                <div className="field-group"><label className="field-label">Start Date</label><input type="date" className="field-input" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} /></div>
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
