// ============================================================
// SURVEY DATA — LocalStorage Persistence Layer
// ============================================================

const STORAGE_KEY = 'surveylens_data';

/**
 * Load survey data from localStorage.
 * Starts with an empty dataset — users fill in everything.
 */
function loadSurveyData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try { return JSON.parse(raw); }
        catch (e) { console.warn('Corrupt survey data, resetting.', e); }
    }
    // First visit — empty
    saveSurveyData([]);
    return [];
}

/** Persist the full dataset to localStorage */
function saveSurveyData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Add a single record, auto-assigning an id */
function addSurveyRecord(record) {
    const data = loadSurveyData();
    record.id = data.length ? Math.max(...data.map(d => d.id)) + 1 : 1;
    data.push(record);
    saveSurveyData(data);
    return data;
}

/** Delete a record by id */
function deleteSurveyRecord(id) {
    let data = loadSurveyData();
    data = data.filter(d => d.id !== id);
    saveSurveyData(data);
    return data;
}

/** Reset to empty */
function resetSurveyData() {
    saveSurveyData([]);
    return [];
}

// Global mutable reference used by app.js
let SURVEY_DATA = loadSurveyData();

// ============================================================
// VOLUNTEER / SERVICE PROVIDER DATA — LocalStorage Persistence
// ============================================================

const VOLUNTEER_STORAGE_KEY = 'surveylens_volunteers';

/** Load volunteer data from localStorage */
function loadVolunteerData() {
    const raw = localStorage.getItem(VOLUNTEER_STORAGE_KEY);
    if (raw) {
        try { return JSON.parse(raw); }
        catch (e) { console.warn('Corrupt volunteer data, resetting.', e); }
    }
    saveVolunteerData([]);
    return [];
}

/** Persist volunteer data to localStorage */
function saveVolunteerData(data) {
    localStorage.setItem(VOLUNTEER_STORAGE_KEY, JSON.stringify(data));
}

/** Add a single volunteer record, auto-assigning an id */
function addVolunteerRecord(record) {
    const data = loadVolunteerData();
    record.id = data.length ? Math.max(...data.map(d => d.id)) + 1 : 1;
    record.registeredOn = new Date().toISOString().split('T')[0];
    data.push(record);
    saveVolunteerData(data);
    return data;
}

/** Delete a volunteer record by id */
function deleteVolunteerRecord(id) {
    let data = loadVolunteerData();
    data = data.filter(d => d.id !== id);
    saveVolunteerData(data);
    return data;
}

/** Reset volunteer data */
function resetVolunteerData() {
    saveVolunteerData([]);
    return [];
}

const ASSIGNMENT_STORAGE_KEY = 'surveylens_assignments';

/** Load assignment data from localStorage */
function loadAssignmentData() {
    const raw = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
    if (raw) {
        try { return JSON.parse(raw); }
        catch (e) { console.warn('Corrupt assignment data, resetting.', e); }
    }
    saveAssignmentData([]);
    return [];
}

/** Persist assignment data to localStorage */
function saveAssignmentData(data) {
    localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(data));
}

/** Add a single assignment record, auto-assigning an id */
function addAssignmentRecord(record) {
    const data = loadAssignmentData();
    record.id = data.length ? Math.max(...data.map(d => d.id)) + 1 : 1;
    record.assignedOn = new Date().toISOString().split('T')[0];
    data.push(record);
    saveAssignmentData(data);
    return data;
}

/** Delete an assignment record by id */
function deleteAssignmentRecord(id) {
    let data = loadAssignmentData();
    data = data.filter(d => d.id !== id);
    saveAssignmentData(data);
    return data;
}

/** Reset assignments */
function resetAssignmentData() {
    saveAssignmentData([]);
    return [];
}

// Global mutable reference for volunteer data
let VOLUNTEER_DATA = loadVolunteerData();
let ASSIGNMENT_DATA = loadAssignmentData();

// ============================================================
// FIREBASE INTEGRATION — Data Sync & Helpers
// ============================================================

/**
 * Data structure validators
 */
export const validators = {
    /**
     * Validate survey record
     * @param {object} record - Survey record to validate
     * @returns {object} - { valid: boolean, errors: array }
     */
    validateSurvey(record) {
        const errors = [];
        
        if (!record.name || record.name.trim().length === 0) {
            errors.push('Name is required');
        }
        
        if (!record.age || record.age < 1 || record.age > 120) {
            errors.push('Valid age is required (1-120)');
        }
        
        if (!record.gender) {
            errors.push('Gender is required');
        }
        
        if (!record.location) {
            errors.push('Location is required');
        }
        
        if (!record.date) {
            errors.push('Survey date is required');
        }
        
        if (!record.issue || record.issue.length === 0) {
            errors.push('At least one issue must be selected');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Validate volunteer record
     * @param {object} record - Volunteer record to validate
     * @returns {object} - { valid: boolean, errors: array }
     */
    validateVolunteer(record) {
        const errors = [];
        
        if (!record.name || record.name.trim().length === 0) {
            errors.push('Name is required');
        }
        
        if (!record.age || record.age < 16 || record.age > 80) {
            errors.push('Valid age is required (16-80)');
        }
        
        if (!record.gender) {
            errors.push('Gender is required');
        }
        
        if (!record.phone || record.phone.length < 10) {
            errors.push('Valid phone number is required');
        }
        
        if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
            errors.push('Valid email format required');
        }
        
        if (!record.area) {
            errors.push('Service area is required');
        }
        
        if (!record.availability) {
            errors.push('Availability is required');
        }
        
        if (!record.experience) {
            errors.push('Experience level is required');
        }
        
        if (!record.issues || record.issues.length === 0) {
            errors.push('At least one issue must be selected');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
};

/**
 * Data formatting utilities
 */
export const formatters = {
    /**
     * Format date to DD/MM/YYYY
     * @param {string} dateStr - ISO date string
     * @returns {string} - Formatted date
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },

    /**
     * Format timestamp to human readable time
     * @param {string} timestamp - ISO timestamp
     * @returns {string} - Formatted time (e.g., "2 hours ago")
     */
    formatTimeAgo(timestamp) {
        if (!timestamp) return '';
        const now = new Date();
        const then = new Date(timestamp);
        const diff = now - then;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return `${days} day${days > 1 ? 's' : ''} ago`;
    },

    /**
     * Format phone number
     * @param {string} phone - Phone number
     * @returns {string} - Formatted phone
     */
    formatPhone(phone) {
        if (!phone) return '';
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, '+91-$1-$2-$3');
    }
};

/**
 * Firebase data sync manager
 * Handles syncing between localStorage and Firebase
 */
export const firebaseSync = {
    /**
     * Sync local data to Firebase
     * @param {string} path - Firebase path ('surveys' or 'volunteers')
     * @param {array} localData - Local data array
     * @param {function} writeToFirebase - Firebase write function
     */
    async syncLocalToFirebase(path, localData, writeToFirebase) {
        if (!localData || !Array.isArray(localData)) {
            console.warn('Invalid data for sync');
            return;
        }

        try {
            for (const record of localData) {
                await writeToFirebase(path, record);
            }
            console.log(`✅ Synced ${localData.length} records to Firebase`);
        } catch (error) {
            console.error('❌ Error syncing to Firebase:', error);
        }
    },

    /**
     * Transform Firebase snapshot to array
     * @param {object} snapshot - Firebase snapshot data
     * @returns {array} - Transformed data array
     */
    transformFirebaseData(snapshot) {
        if (!snapshot) return [];
        
        const data = [];
        if (typeof snapshot === 'object') {
            Object.keys(snapshot).forEach(key => {
                data.push({
                    ...snapshot[key],
                    firebaseId: key
                });
            });
        }
        return data;
    }
};

/**
 * Export all data management functions
 */
export {
    loadSurveyData,
    saveSurveyData,
    addSurveyRecord,
    deleteSurveyRecord,
    resetSurveyData,
    loadVolunteerData,
    saveVolunteerData,
    addVolunteerRecord,
    deleteVolunteerRecord,
    resetVolunteerData,
    loadAssignmentData,
    saveAssignmentData,
    addAssignmentRecord,
    deleteAssignmentRecord,
    resetAssignmentData
};