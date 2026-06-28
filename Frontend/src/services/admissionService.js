// src/services/admissionService.js
import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/admissions';

const getAuthHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

// ============================================
// PROFILE MANAGEMENT
// ============================================

export const getApplicantProfile = async (token, currentUsername = '') => {
  try {
    const response = await axios.get(`${BASE_URL}/profile/`, getAuthHeader(token));
    const data = response.data;
    
    if (data.id) localStorage.setItem('applicantProfileId', data.id);
    
    return {
      id: data.id,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      fatherName: data.father_name || '',
      cnic: data.cnic || '',
      gender: data.gender || '',
      cellPhone: data.phone || '',
      dob: data.date_of_birth || '',
      religion: data.religion || '',
      nationality: data.nationality || 'Pakistani',
      maritalStatus: data.marital_status || '',
      username: data.username || currentUsername,
      profileImage: data.profile_image || null,
      disability: data.disability || false,
      residence: {
        perm_country: data.perm_country || '',
        perm_state: data.perm_state || '',
        perm_city: data.perm_city || '',
        perm_address: data.perm_address || '',
      },
      emergency: {
        name: data.emergency_name || '',
        relation: data.emergency_relation || '',
        phone: data.emergency_phone || '',
      },
      guardian: {
        name: data.guardian_name || '',
        cnic: data.guardian_cnic || '',
        relation: data.guardian_relation || '',
      }
    };
  } catch (error) {
    console.error('Failed to fetch applicant profile:', error);
    return {
      firstName: '', lastName: '', fatherName: '', cnic: '', gender: '', cellPhone: '', dob: '',
      religion: '', nationality: 'Pakistani', maritalStatus: '', username: currentUsername,
      profileImage: null, disability: false,
      residence: { perm_country: '', perm_state: '', perm_city: '', perm_address: '' },
      emergency: { name: '', relation: '', phone: '' },
      guardian: { name: '', cnic: '', relation: '' }
    };
  }
};

export const prepareProfileForBackend = (profileData) => {
  const residence = profileData.residence || {};
  const emergency = profileData.emergency || {};
  const guardian = profileData.guardian || {};
  
  return {
    first_name: profileData.firstName || '',
    last_name: profileData.lastName || '',
    father_name: profileData.fatherName || '',
    cnic: profileData.cnic || '',
    gender: profileData.gender || '',
    phone: profileData.cellPhone || '',
    date_of_birth: profileData.dob || null,
    religion: profileData.religion || '',
    nationality: profileData.nationality || 'Pakistani',
    marital_status: profileData.maritalStatus || '',
    profile_image: profileData.profileImage || null,
    
    perm_country: residence.perm_country || '',
    perm_state: residence.perm_state || '',
    perm_city: residence.perm_city || '',
    perm_address: residence.perm_address || '',
    
    emergency_name: emergency.name || '',
    emergency_relation: emergency.relation || '',
    emergency_phone: emergency.phone || '',
    
    guardian_name: guardian.name || '',
    guardian_cnic: guardian.cnic || '',
    guardian_relation: guardian.relation || '',
  };
};

export const saveApplicantProfile = async (profileData, token) => {
  const response = await axios.post(`${BASE_URL}/profile/`, profileData, getAuthHeader(token));
  return response.data;
};

// ============================================
// ACADEMIC RECORDS
// ============================================

export const addAcademicRecord = async (recordData, token) => {
  const response = await axios.post(`${BASE_URL}/academic/`, recordData, getAuthHeader(token));
  return response.data;
};

export const getAcademicRecords = async (token) => {
  const response = await axios.get(`${BASE_URL}/academic/list/`, getAuthHeader(token));
  return response.data;
};

export const deleteAcademicRecord = async (recordId, token) => {
  const response = await axios.delete(`${BASE_URL}/academic/${recordId}/`, getAuthHeader(token));
  return response.data;
};

// ============================================
// APPLICATIONS
// ============================================

export const getAdmissionPrograms = async (token) => {
  const response = await axios.get(`${BASE_URL}/programs/`, getAuthHeader(token));
  return response.data;
};

export const submitApplication = async (applicationData, token) => {
  const response = await axios.post(`${BASE_URL}/application/`, applicationData, getAuthHeader(token));
  return response.data;
};

export const getMyApplications = async (token) => {
  const response = await axios.get(`${BASE_URL}/application/`, getAuthHeader(token));
  return response.data;
};

export const deleteApplication = async (applicationId, token) => {
  const response = await axios.delete(`${BASE_URL}/application/${applicationId}/`, getAuthHeader(token));
  return response.data;
};

// ============================================
// DOCUMENT MANAGEMENT
// ============================================

export const getMyDocuments = async (token) => {
  const response = await axios.get(`${BASE_URL}/documents/`, getAuthHeader(token));
  console.log('Raw API response for documents:', response.data);
  return response.data;
};

export const uploadDocument = async (documentData, token) => {
  const formData = new FormData();
  formData.append('file', documentData.file);
  formData.append('document_type', documentData.document_type);
  
  const response = await axios.post(`${BASE_URL}/documents/upload/`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const deleteDocument = async (documentId, token) => {
  const response = await axios.delete(`${BASE_URL}/documents/${documentId}/`, getAuthHeader(token));
  return response.data;
};

// ============================================
// ADMIN ADMISSIONS
// ============================================

export const adminListApplications = async (token, statusFilter = '') => {
  const params = statusFilter ? { status: statusFilter } : {};
  const response = await axios.get(`${BASE_URL}/admin/applications/`, {
    ...getAuthHeader(token),
    params,
  });
  return response.data;
};

export const adminGetApplicationDetail = async (applicationId, token) => {
  const response = await axios.get(`${BASE_URL}/admin/applications/${applicationId}/`, getAuthHeader(token));
  return response.data;
};

export const adminMakeDecision = async (applicationId, decisionData, token) => {
  const response = await axios.post(
    `${BASE_URL}/admin/applications/${applicationId}/decide/`,
    decisionData,
    getAuthHeader(token)
  );
  return response.data;
};

export const adminConfirmRegistration = async (applicationId, token) => {
  const response = await axios.post(
    `${BASE_URL}/admin/applications/${applicationId}/confirm-registration/`,
    {},
    getAuthHeader(token)
  );
  return response.data;
};

export const adminDownloadDocument = async (applicationId, docId, token) => {
  const response = await axios.get(
    `${BASE_URL}/admin/applications/${applicationId}/documents/${docId}/download/`,
    { ...getAuthHeader(token), responseType: 'blob' }
  );
  return response;
};

export const adminVerifyDocument = async (applicationId, docId, token) => {
  const response = await axios.post(
    `${BASE_URL}/admin/applications/${applicationId}/documents/${docId}/verify/`,
    {},
    getAuthHeader(token)
  );
  return response.data;
};

export const isApplicationLocked = (applications) => {
  const lockedStatuses = ['pending', 'under_review', 'documents_pending', 'approved', 'rejected', 'waitlist', 'registered'];
  const apps = Array.isArray(applications) ? applications : [];
  return apps.some(app => lockedStatuses.includes(app.status));
};

export const hasRejectedApplication = (applications) => {
  const apps = Array.isArray(applications) ? applications : [];
  return apps.some(app => app.status === 'rejected');
};