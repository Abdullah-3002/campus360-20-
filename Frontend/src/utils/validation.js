// src/utils/validation.js

// ============================================
// NAME VALIDATION
// ============================================
export const isValidName = (value) => {
    return /^[A-Za-z\s]+$/.test(value);
};

export const getNameError = (value, fieldName = 'Name') => {
    if (!value) return `${fieldName} is required`;
    if (!isValidName(value)) return `${fieldName} can only contain letters and spaces`;
    return '';
};

// ============================================
// CNIC VALIDATION (13 digits)
// ============================================
export const isValidCNIC = (value) => {
    return /^\d{13}$/.test(value);
};

export const getCNICError = (value) => {
    if (!value) return 'CNIC is required';
    if (!isValidCNIC(value)) return 'CNIC must be exactly 13 digits';
    return '';
};

// ============================================
// PHONE VALIDATION (10 digits after country code)
// ============================================
export const isValidPhone = (value) => {
    return /^\d{10}$/.test(value);
};

export const getPhoneError = (value) => {
    if (!value) return 'Phone number is required';
    if (!isValidPhone(value)) return 'Phone number must be exactly 10 digits';
    return '';
};

// ============================================
// USERNAME VALIDATION
// ============================================
export const isValidUsername = (value) => {
    return /^[a-zA-Z0-9_.]{3,20}$/.test(value);
};

export const getUsernameError = (value) => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (!isValidUsername(value)) return 'Username can only contain letters, numbers, underscore, and dot';
    return '';
};

// ============================================
// EMAIL VALIDATION
// ============================================
export const isValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const getEmailError = (value) => {
    if (!value) return 'Email is required';
    if (!isValidEmail(value)) return 'Please enter a valid email address';
    return '';
};

// ============================================
// DATE OF BIRTH VALIDATION (Minimum 16 years)
// ============================================
export const isValidDOB = (value) => {
    if (!value) return false;
    const birthDate = new Date(value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 16;
};

export const getDOBError = (value) => {
    if (!value) return 'Date of birth is required';
    if (!isValidDOB(value)) return 'You must be at least 16 years old';
    return '';
};

// ============================================
// PASSWORD VALIDATION
// ============================================
export const isValidPassword = (value) => {
    return value.length >= 8 && 
           /[A-Z]/.test(value) && 
           /[a-z]/.test(value) && 
           /[0-9]/.test(value) && 
           /[^A-Za-z0-9]/.test(value);
};

export const getPasswordError = (value) => {
    if (!value) return 'Password is required';
    if (!isValidPassword(value)) return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    return '';
};

// ============================================
// ADDRESS VALIDATION
// ============================================
export const isValidAddress = (value) => {
    return value && value.trim().length >= 5;
};

export const getAddressError = (value, fieldName = 'Address') => {
    if (!value) return `${fieldName} is required`;
    if (!isValidAddress(value)) return `${fieldName} must be at least 5 characters`;
    return '';
};

// ============================================
// SELECTION VALIDATION (Country, State, City)
// ============================================
export const isValidSelection = (value) => {
    return value && value.trim() !== '';
};

export const getSelectionError = (value, fieldName) => {
    if (!value || value === '') return `Please select ${fieldName}`;
    return '';
};

// ============================================
// EMERGENCY CONTACT VALIDATION
// ============================================
export const isValidEmergencyContact = (emergency) => {
    return emergency && 
           emergency.name && emergency.name.trim() !== '' &&
           emergency.relation && emergency.relation.trim() !== '' &&
           emergency.phone && emergency.phone.trim() !== '';
};

export const getEmergencyContactError = (emergency) => {
    const errors = {};
    if (!emergency?.name) errors.name = 'Emergency contact name is required';
    if (!emergency?.relation) errors.relation = 'Relation is required';
    if (!emergency?.phone) errors.phone = 'Emergency phone number is required';
    if (emergency?.phone && !isValidPhone(emergency.phone)) errors.phone = 'Phone number must be exactly 10 digits';
    return errors;
};

// ============================================
// GUARDIAN VALIDATION
// ============================================
export const isValidGuardian = (guardian) => {
    return guardian && 
           guardian.name && guardian.name.trim() !== '' &&
           guardian.cnic && guardian.cnic.trim() !== '' &&
           guardian.relation && guardian.relation.trim() !== '';
};

export const getGuardianError = (guardian) => {
    const errors = {};
    if (!guardian?.name) errors.name = 'Guardian name is required';
    if (!guardian?.cnic) errors.cnic = 'Guardian CNIC is required';
    if (guardian?.cnic && !isValidCNIC(guardian.cnic)) errors.cnic = 'Guardian CNIC must be exactly 13 digits';
    if (!guardian?.relation) errors.relation = 'Guardian relation is required';
    return errors;
};

// ============================================
// ACADEMIC RECORD VALIDATION
// ============================================
export const isValidAcademicRecord = (record) => {
    return record &&
           record.authority && record.authority.trim() !== '' &&
           record.qualification_level && record.qualification_level.trim() !== '' &&
           record.qualification && record.qualification.trim() !== '' &&
           record.institute && record.institute.trim() !== '' &&
           record.start_year &&
           record.end_year &&
           record.obtained &&
           record.total;
};

export const getAcademicRecordError = (record) => {
    const errors = {};
    if (!record.authority) errors.authority = 'Issuing authority is required';
    if (!record.qualification_level) errors.qualification_level = 'Qualification level is required';
    if (!record.qualification) errors.qualification = 'Qualification is required';
    if (!record.institute) errors.institute = 'Institute name is required';
    if (!record.start_year) errors.start_year = 'Start year is required';
    if (!record.end_year) errors.end_year = 'End year is required';
    if (record.start_year && record.end_year && parseInt(record.end_year) <= parseInt(record.start_year)) {
        errors.end_year = 'End year must be after start year';
    }
    if (!record.obtained) errors.obtained = 'Obtained marks are required';
    if (!record.total) errors.total = 'Total marks are required';
    if (record.obtained && record.total && parseFloat(record.obtained) > parseFloat(record.total)) {
        errors.obtained = 'Obtained marks cannot exceed total marks';
    }
    return errors;
};

// ============================================
// APPLICATION VALIDATION
// ============================================
export const isValidApplication = (application) => {
    return application &&
           application.admission_type &&
           application.preferences &&
           application.preferences.length > 0;
};

export const getApplicationError = (application) => {
    const errors = {};
    if (!application.admission_type) errors.admission_type = 'Admission type is required';
    if (!application.preferences || application.preferences.length === 0) {
        errors.preferences = 'Please add at least one program preference';
    }
    return errors;
};

// ============================================
// DOCUMENT UPLOAD VALIDATION
// ============================================
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

export const isValidDocumentUpload = (file, documentType) => {
    if (!file) return false;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) return false;
    if (file.size > MAX_FILE_SIZE) return false;
    if (!documentType) return false;
    return true;
};

export const getDocumentUploadError = (file, documentType) => {
    if (!file) return 'Please select a file';
    if (!ALLOWED_FILE_TYPES.includes(file.type)) return 'Only PDF, JPG, and PNG files are allowed';
    if (file.size > MAX_FILE_SIZE) return `File size must be ≤ 1 MB (current: ${(file.size / 1024).toFixed(1)} KB)`;
    if (!documentType) return 'Please select document type';
    return '';
};

// ============================================
// PROFILE COMPLETION CHECK
// ============================================
export const isPersonalDetailsComplete = (profile) => {
    return profile &&
           isValidName(profile.firstName) &&
           isValidName(profile.lastName) &&
           isValidName(profile.fatherName) &&
           isValidCNIC(profile.cnic) &&
           profile.gender && profile.gender.trim() !== '' &&
           isValidPhone(profile.cellPhone);
};

export const isResidenceDetailsComplete = (profile) => {
    const residence = profile.residence || {};
    return residence.perm_country && residence.perm_country.trim() !== '' &&
           residence.perm_state && residence.perm_state.trim() !== '' &&
           residence.perm_city && residence.perm_city.trim() !== '' &&
           residence.perm_address && residence.perm_address.trim() !== '';
};

export const isEmergencyContactComplete = (profile) => {
    const emergency = profile.emergency || {};
    return emergency.name && emergency.name.trim() !== '' &&
           emergency.relation && emergency.relation.trim() !== '' &&
           isValidPhone(emergency.phone);
};

export const isGuardianDetailsComplete = (profile) => {
    const guardian = profile.guardian || {};
    return guardian.name && guardian.name.trim() !== '' &&
           isValidCNIC(guardian.cnic) &&
           guardian.relation && guardian.relation.trim() !== '';
};

export const isProfileComplete = (profile) => {
    return isPersonalDetailsComplete(profile) &&
           isResidenceDetailsComplete(profile) &&
           isEmergencyContactComplete(profile) &&
           isGuardianDetailsComplete(profile);
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
export const formatCNIC = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
};

export const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
};

export const getAgeFromDOB = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// ============================================
// REGEX PATTERNS
// ============================================
export const patterns = {
    name: /^[A-Za-z\s]+$/,
    cnic: /^\d{13}$/,
    phone: /^\d{10}$/,
    username: /^[a-zA-Z0-9_.]{3,20}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    rollNumber: /^[A-Za-z0-9-]{5,20}$/,
    marks: /^\d{1,4}$/,
    percentage: /^(100|[1-9]?\d(\.\d{1,2})?)$/
};