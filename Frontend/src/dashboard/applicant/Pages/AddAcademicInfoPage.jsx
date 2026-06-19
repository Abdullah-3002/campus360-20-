// src/dashboard/Pages/AddAcademicInfoPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { addAcademicRecord, uploadDocument, deleteDocument, getMyDocuments } from '../../../services/admissionService';
import { FileIcon, UploadIcon, XIcon, TrashIcon, PlusIcon, InfoIcon } from '../../Icons';

const AddAcademicInfoPage = ({ onCancel }) => {
    const { token } = useAuth();
    const [formFields, setFormFields] = useState({
        authority: '',
        qualification_level: '',
        qualification: '',
        institute: '',
        roll_number: '',
        start_year: '',
        end_year: '',
        obtained: '',
        total: '',
    });
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingDocs, setUploadingDocs] = useState(false);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const fileRef = useRef(null);

    // Authority options
    const authorityOptions = {
        boards: [
            { value: 'BISE Lahore', label: 'BISE Lahore' },
            { value: 'BISE Gujranwala', label: 'BISE Gujranwala' },
            { value: 'BISE Faisalabad', label: 'BISE Faisalabad' },
            { value: 'BISE Multan', label: 'BISE Multan' },
            { value: 'BISE Rawalpindi', label: 'BISE Rawalpindi' },
            { value: 'BISE Sargodha', label: 'BISE Sargodha' },
            { value: 'BISE Bahawalpur', label: 'BISE Bahawalpur' },
            { value: 'BISE Dera Ghazi Khan', label: 'BISE Dera Ghazi Khan' },
            { value: 'BISE Sahiwal', label: 'BISE Sahiwal' },
            { value: 'BISE AJK', label: 'BISE AJK' },
        ],
        international: [
            { value: 'Cambridge O-Level', label: 'Cambridge O-Level' },
            { value: 'Cambridge A-Level', label: 'Cambridge A-Level' },
            { value: 'Edexcel O-Level', label: 'Edexcel O-Level' },
            { value: 'Edexcel A-Level', label: 'Edexcel A-Level' },
            { value: 'Other International Board', label: 'Other International Board' },
        ]
    };

    // Qualification options based on level
    const qualificationOptions = {
        matric: [
            'Matric Science',
            'Matric Arts',
            'Matric Biology',
            'Matric Computer Science',
            'Matric General Science'
        ],
        inter: [
            'FSc Pre-Medical',
            'FSc Pre-Engineering',
            'ICS (Physics)',
            'ICS (Statistics)',
            'ICS (Economics)',
            'FA',
            'I.Com',
            'A-Levels'
        ]
    };

    // Document title options based on qualification level
    const getDocumentTitleOptions = () => {
        if (formFields.qualification_level === 'matric') {
            return [
                { value: 'matric_marksheet', label: 'Matric Marksheet' },
                { value: 'matric_certificate', label: 'Matric Certificate' },
            ];
        } else if (formFields.qualification_level === 'inter') {
            return [
                { value: 'inter_marksheet', label: 'Inter Marksheet' },
                { value: 'inter_certificate', label: 'Inter Certificate' },
            ];
        }
        return [];
    };

    // Load existing academic documents when component mounts
    useEffect(() => {
        const loadAcademicDocuments = async () => {
            if (!token) return;
            try {
                const allDocs = await getMyDocuments(token);
                const docsArray = Array.isArray(allDocs) ? allDocs : (allDocs?.results || []);
                // Filter only academic documents
                const academicDocs = docsArray.filter(doc => 
                    doc.document_type === 'matric_marksheet' || 
                    doc.document_type === 'matric_certificate' ||
                    doc.document_type === 'inter_marksheet' || 
                    doc.document_type === 'inter_certificate'
                );
                setUploadedDocs(academicDocs);
            } catch (error) {
                console.error('Failed to load academic documents:', error);
            } finally {
                setLoadingDocs(false);
            }
        };
        loadAcademicDocuments();
    }, [token]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleAddDoc = async () => {
        if (!selectedFile) {
            alert('Please select a file first');
            return;
        }
        
        const documentType = document.getElementById('acad-doc-title')?.value;
        if (!documentType || documentType === '') {
            alert('Please select a document title');
            return;
        }
        
        // REMOVED: Maximum 4 documents restriction
        
        if (selectedFile.size > 1048576) {
            alert('File size must be ≤ 1 MB.');
            return;
        }

        // Check if document type already exists (optional - you can remove this too)
        const alreadyExists = uploadedDocs.some(doc => doc.document_type === documentType);
        if (alreadyExists) {
            alert('You have already uploaded this document type. Please remove the existing one first.');
            return;
        }

        setUploadingDocs(true);
        
        try {
            // Upload document to backend
            const result = await uploadDocument({
                document_type: documentType,
                file: selectedFile
            }, token);
            
            // Refresh the list to get the newly uploaded document
            const allDocs = await getMyDocuments(token);
            const docsArray = Array.isArray(allDocs) ? allDocs : (allDocs?.results || []);
            const academicDocs = docsArray.filter(doc => 
                doc.document_type === 'matric_marksheet' || 
                doc.document_type === 'matric_certificate' ||
                doc.document_type === 'inter_marksheet' || 
                doc.document_type === 'inter_certificate'
            );
            setUploadedDocs(academicDocs);
            
            setSelectedFile(null);
            if (fileRef.current) {
                fileRef.current.value = '';
            }
            alert('Document uploaded successfully!');
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload document: ' + (error.response?.data?.error || error.message));
        } finally {
            setUploadingDocs(false);
        }
    };

    const handleRemoveDoc = async (documentId, documentType) => {
        if (!confirm('Are you sure you want to remove this document?')) return;
        
        try {
            await deleteDocument(documentId, token);
            
            // Update local list
            setUploadedDocs(uploadedDocs.filter(doc => doc.document_id !== documentId));
            alert('Document removed successfully');
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to remove document');
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

    const handleSubmit = async () => {
        // Validation
        if (!formFields.authority) {
            alert('Please select Issuing Authority');
            return;
        }
        if (!formFields.qualification_level) {
            alert('Please select Qualification Level');
            return;
        }
        if (!formFields.qualification) {
            alert('Please enter Qualification');
            return;
        }
        if (!formFields.institute) {
            alert('Please enter Institute name');
            return;
        }
        if (!formFields.start_year) {
            alert('Please select Start Year');
            return;
        }
        if (!formFields.end_year) {
            alert('Please select End Year');
            return;
        }
        if (!formFields.obtained) {
            alert('Please enter obtained marks');
            return;
        }
        if (!formFields.total) {
            alert('Please enter total marks');
            return;
        }

        setSubmitting(true);
        
        try {
            const recordData = {
                authority: formFields.authority,
                qualification_level: formFields.qualification_level,
                qualification: formFields.qualification,
                institute: formFields.institute,
                roll_number: formFields.roll_number || '',
                start_year: parseInt(formFields.start_year),
                end_year: parseInt(formFields.end_year),
                grading_system: 'marks',
                obtained: parseFloat(formFields.obtained),
                total: parseFloat(formFields.total),
            };
            
            console.log('Sending academic record:', recordData);
            
            await addAcademicRecord(recordData, token);
            alert('Academic record saved successfully!');
            onCancel();
        } catch (error) {
            console.error('Error saving academic record:', error);
            const errorMsg = error.response?.data?.message || 
                            error.response?.data?.error || 
                            JSON.stringify(error.response?.data) ||
                            'Failed to save academic record';
            alert('Failed to save: ' + errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const getQualificationOptions = () => {
        if (formFields.qualification_level === 'matric') {
            return qualificationOptions.matric;
        } else if (formFields.qualification_level === 'inter') {
            return qualificationOptions.inter;
        }
        return [];
    };

    if (loadingDocs) {
        return (
            <div className="page-container fade-in">
                <div className="loading-spinner">Loading documents...</div>
            </div>
        );
    }

    return (
        <div className="page-container fade-in">
            <div className="page-header-minimal">
                <div className="breadcrumb-minimal">DASHBOARD &gt; ACADEMIC INFORMATION &gt; ADD NEW</div>
                <h1 className="page-title-minimal">Add Academic Information</h1>
            </div>

            {/* Academic Form */}
            <div className="form-card">
                <div className="section-header">
                    <div className="section-header-icon"><FileIcon /></div>
                    <h2 className="section-title">Academic Details</h2>
                </div>

                <div className="two-column-grid">
                    <div className="field-group">
                        <label className="field-label">Issuing Authority (Board/University) <span className="required">*</span></label>
                        <select 
                            className="field-input field-select" 
                            value={formFields.authority} 
                            onChange={(e) => setFormFields({...formFields, authority: e.target.value})}
                        >
                            <option value="">Select Authority</option>
                            <optgroup label="Punjab Boards">
                                {authorityOptions.boards.map(board => (
                                    <option key={board.value} value={board.value}>{board.label}</option>
                                ))}
                            </optgroup>
                            <optgroup label="International / O-A Levels">
                                {authorityOptions.international.map(board => (
                                    <option key={board.value} value={board.value}>{board.label}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                    <div className="field-group">
                        <label className="field-label">Qualification Level <span className="required">*</span></label>
                        <select 
                            className="field-input field-select" 
                            value={formFields.qualification_level} 
                            onChange={(e) => {
                                setFormFields({...formFields, qualification_level: e.target.value, qualification: ''});
                            }}
                        >
                            <option value="">Select Level</option>
                            <option value="matric">Matric / O-Level</option>
                            <option value="inter">Intermediate / A-Level</option>
                        </select>
                    </div>
                </div>

                <div className="two-column-grid">
                    <div className="field-group">
                        <label className="field-label">Qualification <span className="required">*</span></label>
                        {getQualificationOptions().length > 0 ? (
                            <select 
                                className="field-input field-select" 
                                value={formFields.qualification} 
                                onChange={(e) => setFormFields({...formFields, qualification: e.target.value})}
                            >
                                <option value="">Select Qualification</option>
                                {getQualificationOptions().map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : (
                            <input 
                                type="text" 
                                className="field-input" 
                                placeholder="Select Qualification Level first" 
                                value={formFields.qualification} 
                                disabled
                            />
                        )}
                    </div>
                    <div className="field-group">
                        <label className="field-label">Institute <span className="required">*</span></label>
                        <input 
                            type="text" 
                            className="field-input" 
                            placeholder="Enter Institute Name" 
                            value={formFields.institute} 
                            onChange={(e) => setFormFields({...formFields, institute: e.target.value})}
                        />
                    </div>
                </div>

                <div className="two-column-grid">
                    <div className="field-group">
                        <label className="field-label">Roll No.</label>
                        <input 
                            type="text" 
                            className="field-input" 
                            placeholder="Enter Roll No." 
                            maxLength="20"
                            value={formFields.roll_number}
                            onChange={(e) => setFormFields({...formFields, roll_number: e.target.value})}
                        />
                    </div>
                    <div className="field-group">
                        <label className="field-label">Start Year <span className="required">*</span></label>
                        <select 
                            className="field-input field-select" 
                            value={formFields.start_year} 
                            onChange={(e) => setFormFields({...formFields, start_year: e.target.value})}
                        >
                            <option value="">Select Year</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                <div className="two-column-grid">
                    <div className="field-group">
                        <label className="field-label">End Year <span className="required">*</span></label>
                        <select 
                            className="field-input field-select" 
                            value={formFields.end_year} 
                            onChange={(e) => setFormFields({...formFields, end_year: e.target.value})}
                        >
                            <option value="">Select Year</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                <div className="two-column-grid">
                    <div className="field-group">
                        <label className="field-label">Obtained Marks <span className="required">*</span></label>
                        <input 
                            type="text" 
                            className="field-input" 
                            placeholder="e.g. 950" 
                            maxLength="10"
                            value={formFields.obtained}
                            onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                setFormFields({...formFields, obtained: val});
                            }}
                        />
                    </div>
                    <div className="field-group">
                        <label className="field-label">Total Marks <span className="required">*</span></label>
                        <input 
                            type="text" 
                            className="field-input" 
                            placeholder="e.g. 1100" 
                            maxLength="10"
                            value={formFields.total}
                            onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                setFormFields({...formFields, total: val});
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Document Upload Section */}
            <div className="form-card">
                <div className="section-header">
                    <div className="section-header-icon"><UploadIcon /></div>
                    <h2 className="section-title">Academic Documents</h2>
                </div>

                <div className="info-banner compact">
                    <InfoIcon />
                    <span>Upload your academic documents (Marksheets, Certificates). Each file size must be ≤ 1 MB. Accepted: PDF, JPG, PNG</span>
                </div>

                <div className="two-column-grid">
                    <div className="field-group">
                        <label className="field-label">Document Type <span className="required">*</span></label>
                        <select className="field-input field-select" id="acad-doc-title">
                            <option value="">Select Document Type</option>
                            {getDocumentTitleOptions().map(option => (
                                <option 
                                    key={option.value} 
                                    value={option.value}
                                    disabled={uploadedDocs.some(doc => doc.document_type === option.value)}
                                >
                                    {option.label}
                                    {uploadedDocs.some(doc => doc.document_type === option.value) && " (Uploaded)"}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="field-group">
                        <label className="field-label">File Upload <span className="required">*</span></label>
                        <div 
                            className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
                            onDragEnter={handleDrag} 
                            onDragOver={handleDrag} 
                            onDragLeave={handleDrag} 
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={fileRef} 
                                onChange={handleFileSelect} 
                                style={{ display: 'none' }} 
                                accept=".pdf,.jpg,.jpeg,.png" 
                            />
                            {selectedFile ? (
                                <div className="file-selected">
                                    <FileIcon />
                                    <span>{selectedFile.name}</span>
                                    <button 
                                        className="file-remove-btn" 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setSelectedFile(null);
                                            if (fileRef.current) fileRef.current.value = '';
                                        }}
                                    >
                                        <XIcon />
                                    </button>
                                </div>
                            ) : (
                                <div className="file-drop-content">
                                    <UploadIcon />
                                    <p><strong>Click to upload</strong> or drag and drop</p>
                                    <span className="file-hint">PDF, JPG, PNG (max 1 MB)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '10px' }}>
                    <button 
                        className="btn-add" 
                        onClick={handleAddDoc} 
                        disabled={!selectedFile || uploadingDocs}
                    >
                        {uploadingDocs ? 'Uploading...' : <><PlusIcon /> Upload Document</>}
                    </button>
                </div>

                {/* Uploaded Documents Table */}
                {uploadedDocs.length > 0 && (
                    <div className="data-table-wrapper" style={{ marginTop: '20px' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Document Type</th>
                                    <th>File Name</th>
                                    <th>Status</th>
                                    <th>Uploaded At</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uploadedDocs.map((doc) => (
                                    <tr key={doc.document_id}>
                                        <td>{
                                            doc.document_type === 'matric_marksheet' ? 'Matric Marksheet' :
                                            doc.document_type === 'matric_certificate' ? 'Matric Certificate' :
                                            doc.document_type === 'inter_marksheet' ? 'Inter Marksheet' :
                                            doc.document_type === 'inter_certificate' ? 'Inter Certificate' : doc.document_type
                                        }</td>
                                        <td>{doc.file_name}</td>
                                        <td>
                                            <span className={`status-badge ${doc.is_verified ? 'approved' : 'pending'}`}>
                                                {doc.is_verified ? 'VERIFIED' : 'PENDING'}
                                            </span>
                                        </td>
                                        <td>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}</td>
                                        <td>
                                            <button 
                                                className="action-btn danger" 
                                                onClick={() => handleRemoveDoc(doc.document_id, doc.document_type)}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="form-actions">
                <button className="btn-verify" onClick={onCancel} disabled={submitting}>
                    Cancel
                </button>
                <button className="btn-save" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Academic Record'}
                </button>
            </div>
        </div>
    );
};

export default AddAcademicInfoPage;