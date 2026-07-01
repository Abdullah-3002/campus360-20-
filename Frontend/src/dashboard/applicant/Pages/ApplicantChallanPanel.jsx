import React, { useState, useRef, useEffect } from 'react';

import { useAuth } from '../../../context/AuthContext';

import { downloadAdmissionChallan, uploadDocument } from '../../../services/admissionService';

import { FileIcon, UploadIcon } from '../../Icons';



const ApplicantChallanPanel = ({ application, onChallanUploaded }) => {

    const { token } = useAuth();

    const fileRef = useRef(null);

    const [challanInfo, setChallanInfo] = useState(null);

    const [loading, setLoading] = useState(false);

    const [uploading, setUploading] = useState(false);

    const [selectedFile, setSelectedFile] = useState(null);



    useEffect(() => {

        if (!token) return;

        downloadAdmissionChallan(token, 'json')

            .then(res => setChallanInfo(res.data))

            .catch(() => {});

    }, [token, application?.application_number]);



    const handleDownload = async () => {

        setLoading(true);

        try {

            const response = await downloadAdmissionChallan(token, 'pdf');

            const blob = new Blob([response.data], { type: 'application/pdf' });

            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');

            a.href = url;

            a.download = `Admission-Challan-${challanInfo?.challan_number || application?.application_number || 'challan'}.pdf`;

            a.click();

            URL.revokeObjectURL(url);

            if (!challanInfo) {

                const infoRes = await downloadAdmissionChallan(token, 'json');

                setChallanInfo(infoRes.data);

            }

        } catch (error) {

            alert(error.response?.data?.error || 'Failed to download challan PDF');

        } finally {

            setLoading(false);

        }

    };



    const handleUpload = async () => {

        if (!selectedFile) {

            alert('Please select the paid challan photo first.');

            return;

        }

        setUploading(true);

        try {

            const res = await uploadDocument({ document_type: 'paid_challan', file: selectedFile }, token);

            alert(res?.message || 'Paid challan uploaded successfully.');

            setSelectedFile(null);

            if (fileRef.current) fileRef.current.value = '';

            if (onChallanUploaded) onChallanUploaded();

        } catch (error) {

            const err = error.response?.data?.error || error.response?.data?.detail || 'Failed to upload paid challan';

            alert(typeof err === 'string' ? err : JSON.stringify(err));

        } finally {

            setUploading(false);

        }

    };



    const amountDisplay = challanInfo?.amount_display || (application?.challan_amount ? `Rs. ${application.challan_amount}` : null);



    return (

        <div className="form-card" style={{ marginBottom: '20px', border: '2px solid #4169E1', background: 'var(--bg-card)' }}>

            <div className="section-header">

                <div className="section-header-icon"><FileIcon /></div>

                <h2 className="section-title">Admission Fee Challan</h2>

            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>

                Your application <strong>{application?.application_number}</strong> has been submitted.

                Download your program fee challan (PDF), pay at the bank, then upload a clear photo of the <strong>paid</strong> challan.

                OCR will verify challan number, amount, and readability.

            </p>

            {challanInfo && (

                <div className="info-banner compact" style={{ marginBottom: '16px', display: 'grid', gap: '4px' }}>

                    <span>Challan: <strong>{challanInfo.challan_number}</strong> | Amount: <strong>{challanInfo.amount_display}</strong></span>

                    <span>Program: <strong>{challanInfo.program_name}</strong> ({challanInfo.program_code})</span>

                    <span>Applicant: <strong>{challanInfo.applicant_name}</strong> | CNIC: {challanInfo.cnic}</span>

                    <span>Due: <strong>{challanInfo.due_date}</strong></span>

                </div>

            )}

            {!challanInfo && amountDisplay && (

                <div className="info-banner compact" style={{ marginBottom: '16px' }}>

                    <span>Amount: <strong>{amountDisplay}</strong></span>

                </div>

            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>

                <button className="btn-update" onClick={handleDownload} disabled={loading}>

                    <FileIcon /> {loading ? 'Preparing PDF...' : 'Download Challan PDF'}

                </button>

            </div>

            <div className="field-group">

                <label className="field-label">Upload Photo of Paid Challan <span className="required">*</span></label>

                <div className="file-drop-zone" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>

                    <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png"

                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />

                    <div className="file-drop-content">

                        <UploadIcon />

                        <p>{selectedFile ? selectedFile.name : 'Click to upload paid challan photo'}</p>

                        <span className="file-hint">PDF, JPG, PNG (max 1 MB) — must show challan no., amount & bank stamp</span>

                    </div>

                </div>

            </div>

            <div className="form-actions" style={{ marginTop: '12px' }}>

                <button className="btn-save" onClick={handleUpload} disabled={!selectedFile || uploading}>

                    {uploading ? 'Verifying & Uploading...' : 'Upload Paid Challan'}

                </button>

            </div>

        </div>

    );

};



export default ApplicantChallanPanel;

