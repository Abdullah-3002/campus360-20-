import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listNotifications, sendNotification, createAnnouncement } from '../../../services/notificationsService';
import { normalizeList } from '../../../services/api';
import { PageHeader, useTableFilter, TablePagination, LoadingSpinner, EmptyRow, useToast, formatDate } from '../../shared/helpers';
import { PlusIcon, BellIcon, XIcon } from '../../Icons';

const NotificationsListingPage = () => {
    const { token } = useAuth();
    const { showToast, Toast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', message: '', recipient_type: 'all' });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try { setItems(normalizeList(await listNotifications(token))); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const { search, setSearch, page, setPage, paginated, filtered, totalPages, pageSize } = useTableFilter(items, ['title', 'message']);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await sendNotification(formData, token);
            showToast('Notification sent');
            setShowModal(false);
            load();
        } catch (e) {
            try {
                await createAnnouncement(formData, token);
                showToast('Announcement created');
                setShowModal(false);
                load();
            } catch (err) {
                alert('Failed to send notification');
            }
        } finally { setSubmitting(false); }
    };

    if (loading) return <LoadingSpinner message="Loading notifications..." />;

    return (
        <div className="page-container fade-in">
            {Toast}
            <PageHeader breadcrumb="DASHBOARD > NOTIFICATIONS" title="Notifications Management" />
            <div className="form-card">
                <div className="table-toolbar">
                    <div className="table-search search-bar" style={{ maxWidth: 360 }}>
                        <input type="text" placeholder="Search..." className="search-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <button className="btn-add" onClick={() => setShowModal(true)}><PlusIcon /> <span>Send Notification</span></button>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Sr#</th><th>Title</th><th>Message</th><th>Date</th><th>Read</th></tr></thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <EmptyRow colSpan={5} icon={<BellIcon size={20} />} title="No notifications" />
                            ) : paginated.map((item, i) => (
                                <tr key={item.notification_id || i}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    <td>{item.title || item.subject || '—'}</td>
                                    <td>{(item.message || item.content || '').substring(0, 60)}...</td>
                                    <td>{formatDate(item.created_at)}</td>
                                    <td>{item.is_read ? 'Yes' : 'No'}</td>
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
                        <div className="modal-header"><h3>Send Notification</h3><button className="close-btn" onClick={() => setShowModal(false)}><XIcon /></button></div>
                        <div className="modal-body">
                            <div className="field-group"><label className="field-label">Title</label><input className="field-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                            <div className="field-group"><label className="field-label">Message</label><textarea className="field-input field-textarea" value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Sending...' : 'Send'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsListingPage;
