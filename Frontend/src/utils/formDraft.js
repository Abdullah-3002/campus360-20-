const draftKey = (userId, formName) => `campus360_draft_${userId}_${formName}`;

export const saveFormDraft = (userId, formName, data) => {
    if (!userId) return;
    try {
        localStorage.setItem(draftKey(userId, formName), JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save form draft', e);
    }
};

export const loadFormDraft = (userId, formName) => {
    if (!userId) return null;
    try {
        const raw = localStorage.getItem(draftKey(userId, formName));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const clearFormDraft = (userId, formName) => {
    if (!userId) return;
    localStorage.removeItem(draftKey(userId, formName));
};

export const mergeProfileDraft = (userId, serverProfile) => {
    const draft = loadFormDraft(userId, 'profile');
    if (!draft) return serverProfile;
    return {
        ...serverProfile,
        ...draft,
        residence: { ...serverProfile.residence, ...(draft.residence || {}) },
        emergency: { ...serverProfile.emergency, ...(draft.emergency || {}) },
        guardian: { ...serverProfile.guardian, ...(draft.guardian || {}) },
    };
};
