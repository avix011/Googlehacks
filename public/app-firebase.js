// ============================================================
// SurveyLens Dashboard — Main Application Logic with Firebase
// ============================================================

import {
    database,
    ref,
    push,
    onValue,
    remove,
    isFirebaseEnabled,
    isFirebaseConfigured,
    writeToFirebase,
    readFromFirebase,
    deleteFromFirebase
} from './firebase-config.js';

import {
    validators,
    formatters,
    firebaseSync,
    loadSurveyData,
    saveSurveyData,
    addSurveyRecord,
    deleteSurveyRecord,
    loadVolunteerData,
    saveVolunteerData,
    addVolunteerRecord,
    deleteVolunteerRecord,
    loadAssignmentData,
    addAssignmentRecord,
    deleteAssignmentRecord
} from './data.js';

// ============================================================
// APPLICATION STATE
// ============================================================

let currentSection = 'add-survey';
let SURVEY_DATA = [];
let VOLUNTEER_DATA = [];
let ASSIGNMENT_DATA = [];
let filteredData = [];
let sortColumn = 'id';
let sortDirection = 'asc';
let currentPage = 1;
const rowsPerPage = 12;
let currentAssignmentTab = 'unassigned';
let currentVerificationImage = null;
let currentVerificationCoords = null;

// Firebase listeners (to unsubscribe later)
let surveyListener = null;
let volunteerListener = null;

// Chart instances
const charts = {};

// Color palette
const CHART_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#06b6d4', '#f43f5e', '#84cc16',
    '#a855f7', '#14b8a6', '#e11d48', '#facc15'
];

const CHART_COLORS_ALPHA = CHART_COLORS.map(c => c + '33');

// ============================================================
// FIREBASE INITIALIZATION & REAL-TIME SYNC
// ============================================================

/**
 * Initialize Firebase listeners for real-time data sync
 */
function initializeFirebaseSync() {
    console.log('🔄 Initializing Firebase sync...');
    
    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
        console.warn('⚠️ Firebase not configured. Using localStorage only.');
        loadLocalData();
        return;
    }

    if (!isFirebaseEnabled) {
        console.warn('⚠️ Firebase not available. Using localStorage only.');
        loadLocalData();
        return;
    }

    // Listen for survey data changes
    surveyListener = readFromFirebase('surveys', (data) => {
        if (data) {
            SURVEY_DATA = Object.keys(data).map(key => ({
                ...data[key],
                firebaseId: key
            }));
            console.log('📊 Surveys synced from Firebase:', SURVEY_DATA.length);
            updateSidebarCount();
            if (currentSection === 'data-table') renderDataTable();
            if (currentSection === 'overview') renderOverview();
            if (currentSection === 'analytics') renderAnalytics();
        }
    });

    // Listen for volunteer data changes
    volunteerListener = readFromFirebase('volunteers', (data) => {
        if (data) {
            VOLUNTEER_DATA = Object.keys(data).map(key => ({
                ...data[key],
                firebaseId: key
            }));
            console.log('🧑‍🤝‍🧑 Volunteers synced from Firebase:', VOLUNTEER_DATA.length);
            if (currentSection === 'volunteer') renderVolunteerSection();
        }
    });
}

/**
 * Load data from localStorage
 */
function loadLocalData() {
    SURVEY_DATA = loadSurveyData() || [];
    VOLUNTEER_DATA = loadVolunteerData() || [];
    ASSIGNMENT_DATA = loadAssignmentData() || [];
    console.log('📂 Loaded from localStorage - Surveys:', SURVEY_DATA.length, 'Volunteers:', VOLUNTEER_DATA.length, 'Assignments:', ASSIGNMENT_DATA.length);
}

// ============================================================
// UTILITY HELPERS
// ============================================================

function unique(arr, key) {
    const allValues = arr.flatMap(item => {
        const value = item[key];
        if (typeof value === 'string' && value.includes(',')) {
            return value.split(',').map(s => s.trim()).filter(s => s);
        }
        return value ? [value] : [];
    });
    return [...new Set(allValues)].sort();
}

/**
 * Destroy all chart instances
 */
function destroyAllCharts() {
    Object.keys(charts).forEach(chartId => {
        if (charts[chartId]) {
            charts[chartId].destroy();
            delete charts[chartId];
        }
    });
}

function countBy(arr, key) {
    const map = {};
    if (key === 'issue') {
        arr.forEach(d => {
            String(d.issue || '').split(',').forEach(i => {
                const trimmed = i.trim();
                if (trimmed) map[trimmed] = (map[trimmed] || 0) + 1;
            });
        });
    } else {
        arr.forEach(d => { 
            if (d[key]) map[d[key]] = (map[d[key]] || 0) + 1; 
        });
    }
    return map;
}

function avgBy(arr, key) {
    if (!arr.length) return 0;
    return Math.round(arr.reduce((s, d) => s + (d[key] || 0), 0) / arr.length);
}

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
    console.log('🚀 Initializing SurveyLens Dashboard...');
    
    // Setup UI
    setupNavigation();
    setupSearch();
    setupTableSort();
    setupFilterListeners();
    setupMobileMenu();
    setupSurveyForm();
    setupVolunteerForm();
    setupResetButton();
    
    // Verification modal logic
    const closeBtn = document.getElementById('btn-close-modal');
    const modal = document.getElementById('verification-modal');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
    
    // Initialize Firebase with fallback to localStorage
    initializeFirebaseSync();
    
    // Load initial data
    updateSidebarCount();
    refreshFilterDropdowns();
    
    // Render initial section
    renderSection('add-survey');
    
    console.log('✅ Dashboard initialized');
}

function updateSidebarCount() {
    const el = document.getElementById('record-count-sidebar');
    if (el) {
        el.textContent = `${SURVEY_DATA.length} records loaded`;
    }
}

// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section === currentSection) return;

            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            currentSection = section;
            renderSection(section);

            document.getElementById('sidebar')?.classList.remove('open');
        });
    });
}

function setupMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-content');

    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar?.classList.toggle('open');
        });
    }

    if (main) {
        main.addEventListener('click', (e) => {
            if (!e.target.closest('.sidebar')) {
                sidebar?.classList.remove('open');
            }
        });
    }
}

function renderSection(section) {
    const titles = {
        'add-survey': ['New Survey Entry', 'Fill in the form to add a new survey record'],
        'volunteer':  ['Volunteer Registration', 'Register as a service provider for the community'],
        'assignments':['Volunteer Assignments', 'Match volunteers with specific survey issues'],
        'overview':   ['Dashboard Overview', 'Real-time survey analytics and insights'],
        'data-table': ['Survey Data', 'View, sort, and filter all collected records'],
        'analytics':  ['Analyze Data', 'Charts and visual breakdowns of survey data'],
        'patterns':   ['Pattern Recognition', 'AI-detected correlations and trends']
    };

    const [title, subtitle] = titles[section] || ['Dashboard', ''];
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    if (pageTitle) pageTitle.textContent = title;
    if (pageSubtitle) pageSubtitle.textContent = subtitle;

    // Deactivate all sections first
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

    // Destroy all charts before rendering new section
    destroyAllCharts();
    
    const sectionEl = document.getElementById('section-' + section);
    if (sectionEl) sectionEl.classList.add('active');

    // Refresh filter dropdowns for data table and analytics sections
    refreshFilterDropdowns();

    switch (section) {
        case 'add-survey': 
            updateLocationSuggestions(); 
            break;
        case 'volunteer':  
            renderVolunteerSection(); 
            break;
        case 'assignments':
            renderAssignments(); 
            break;
        case 'overview':   
            renderOverview(); 
            break;
        case 'data-table': 
            renderDataTable();
            applyTableFilters(); 
            break;
        case 'analytics':  
            renderAnalytics(); 
            break;
        case 'patterns':   
            renderPatterns(); 
            break;
    }
}

// ============================================================
// SURVEY FORM
// ============================================================

function setupSurveyForm() {
    const form = document.getElementById('survey-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (validateSurveyForm()) await submitSurveyForm();
    });

    form.addEventListener('reset', () => {
        setTimeout(() => {
            clearSurveyErrors();
            setDefaultSurveyDate();
        }, 10);
    });

    // Live error clearing
    ['field-name', 'field-age', 'field-gender', 'field-location', 'field-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                el.closest('.form-field')?.classList.remove('has-error');
                const errEl = document.getElementById('err-' + id.replace('field-', ''));
                if (errEl) errEl.textContent = '';
            });
        }
    });

    document.querySelectorAll('input[name="issue"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const errEl = document.getElementById('err-issue');
            if (errEl) errEl.textContent = '';
        });
    });

    // Verification Image Logic
    const imgField = document.getElementById('field-image');
    const previewContainer = document.getElementById('verification-preview');
    const previewImg = document.getElementById('preview-img');
    const coordsText = document.getElementById('coords-text');
    const btnRemoveImg = document.getElementById('btn-remove-image');

    if (imgField) {
        imgField.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (previewContainer) previewContainer.style.display = 'block';
            if (coordsText) coordsText.textContent = 'Fetching location...';

            // Resize and compress image
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    if (previewImg) previewImg.src = dataUrl;
                    currentVerificationImage = dataUrl;
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);

            // Fetch location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        currentVerificationCoords = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        if (coordsText) coordsText.textContent = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                    },
                    (err) => {
                        console.warn('Geolocation error:', err);
                        if (coordsText) coordsText.textContent = 'Location access denied/failed';
                        currentVerificationCoords = null;
                    }
                );
            } else {
                if (coordsText) coordsText.textContent = 'Geolocation not supported';
            }
        });
    }

    if (btnRemoveImg) {
        btnRemoveImg.addEventListener('click', () => {
            if (imgField) imgField.value = '';
            if (previewContainer) previewContainer.style.display = 'none';
            if (previewImg) previewImg.src = '';
            currentVerificationImage = null;
            currentVerificationCoords = null;
        });
    }
}

function setDefaultSurveyDate() {
    const dateField = document.getElementById('field-date');
    if (dateField) dateField.value = new Date().toISOString().split('T')[0];
}

function validateSurveyForm() {
    let valid = true;
    clearSurveyErrors();

    const name = document.getElementById('field-name')?.value.trim() || '';
    const age = document.getElementById('field-age')?.value || '';
    const gender = document.getElementById('field-gender')?.value || '';
    const location = document.getElementById('field-location')?.value || '';
    const date = document.getElementById('field-date')?.value || '';
    const checkedIssues = document.querySelectorAll('input[name="issue"]:checked');

    if (!name) { setSurveyFieldError('name', 'Name is required'); valid = false; }
    if (!age || age < 1 || age > 120) { setSurveyFieldError('age', 'Enter a valid age (1–120)'); valid = false; }
    if (!gender) { setSurveyFieldError('gender', 'Select a gender'); valid = false; }
    if (!location) { setSurveyFieldError('location', 'Select a village or area'); valid = false; }
    if (!date) { setSurveyFieldError('date', 'Survey date is missing'); valid = false; }
    if (!checkedIssues.length) { 
        const errEl = document.getElementById('err-issue');
        if (errEl) errEl.textContent = 'Select at least one issue';
        valid = false; 
    }

    return valid;
}

function setSurveyFieldError(fieldName, msg) {
    const errEl = document.getElementById('err-' + fieldName);
    if (errEl) errEl.textContent = msg;
    const fieldEl = document.getElementById('field-' + fieldName);
    if (fieldEl) fieldEl.closest('.form-field')?.classList.add('has-error');
}

function clearSurveyErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-field.has-error').forEach(el => el.classList.remove('has-error'));
}

async function submitSurveyForm() {
    const checkedIssues = [...document.querySelectorAll('input[name="issue"]:checked')].map(cb => cb.value);

    const record = {
        name: document.getElementById('field-name')?.value.trim() || '',
        age: parseInt(document.getElementById('field-age')?.value || 0, 10),
        gender: document.getElementById('field-gender')?.value || '',
        location: document.getElementById('field-location')?.value || '',
        education: 'Not provided',
        date: document.getElementById('field-date')?.value || '',
        issue: checkedIssues.join(', '),
        notes: document.getElementById('field-notes')?.value.trim() || '',
        verificationImage: currentVerificationImage,
        verificationCoords: currentVerificationCoords
    };

    // Validate
    const validation = validators.validateSurvey(record);
    if (!validation.valid) {
        validation.errors.forEach(err => console.warn('Validation error:', err));
        return;
    }

    try {
        // Save to localStorage
        SURVEY_DATA = addSurveyRecord(record);
        
        // Write to Firebase (if available)
        if (isFirebaseEnabled && isFirebaseConfigured()) {
            await writeToFirebase('surveys', record);
            console.log('✅ Survey saved to Firebase and localStorage');
        } else {
            console.log('✅ Survey saved to localStorage');
        }

        // Show toast notification
        const toast = document.getElementById('form-toast');
        if (toast) {
            toast.classList.add('visible');
            setTimeout(() => toast.classList.remove('visible'), 4000);
        }

        // Reset form
        document.getElementById('survey-form')?.reset();
        setDefaultSurveyDate();
        clearSurveyErrors();
        
        const previewContainer = document.getElementById('verification-preview');
        const previewImg = document.getElementById('preview-img');
        if (previewContainer) previewContainer.style.display = 'none';
        if (previewImg) previewImg.src = '';
        currentVerificationImage = null;
        currentVerificationCoords = null;
        
        updateSidebarCount();
        refreshFilterDropdowns();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error submitting survey:', error);
        alert('Error saving survey. Please try again.');
    }
}

// ============================================================
// VOLUNTEER FORM
// ============================================================

function setupVolunteerForm() {
    const form = document.getElementById('volunteer-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (validateVolunteerForm()) await submitVolunteerForm();
    });

    form.addEventListener('reset', () => {
        setTimeout(() => {
            clearVolunteerErrors();
        }, 10);
    });

    // Live error clearing
    ['vol-name', 'vol-age', 'vol-gender', 'vol-phone', 'vol-area', 'vol-availability', 'vol-experience'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                el.closest('.form-field')?.classList.remove('has-error');
                const errEl = document.getElementById('err-' + id);
                if (errEl) errEl.textContent = '';
            });
        }
    });

    document.querySelectorAll('input[name="vol-issue"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const errEl = document.getElementById('err-vol-issue');
            if (errEl) errEl.textContent = '';
        });
    });
}

function validateVolunteerForm() {
    let valid = true;
    clearVolunteerErrors();

    const name = document.getElementById('vol-name')?.value.trim() || '';
    const age = document.getElementById('vol-age')?.value || '';
    const gender = document.getElementById('vol-gender')?.value || '';
    const phone = document.getElementById('vol-phone')?.value.trim() || '';
    const email = document.getElementById('vol-email')?.value.trim() || '';
    const area = document.getElementById('vol-area')?.value || '';
    const availability = document.getElementById('vol-availability')?.value || '';
    const experience = document.getElementById('vol-experience')?.value || '';
    const checkedIssues = document.querySelectorAll('input[name="vol-issue"]:checked');

    if (!name) { setVolunteerFieldError('vol-name', 'Name is required'); valid = false; }
    if (!age || age < 16 || age > 80) { setVolunteerFieldError('vol-age', 'Enter a valid age (16–80)'); valid = false; }
    if (!gender) { setVolunteerFieldError('vol-gender', 'Select a gender'); valid = false; }
    if (!phone || phone.length < 10) { setVolunteerFieldError('vol-phone', 'Enter a valid phone number'); valid = false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setVolunteerFieldError('vol-email', 'Enter a valid email'); valid = false; }
    if (!area) { setVolunteerFieldError('vol-area', 'Select a service area'); valid = false; }
    if (!availability) { setVolunteerFieldError('vol-availability', 'Select availability'); valid = false; }
    if (!experience) { setVolunteerFieldError('vol-experience', 'Select experience level'); valid = false; }
    if (!checkedIssues.length) { 
        const errEl = document.getElementById('err-vol-issue');
        if (errEl) errEl.textContent = 'Select at least one issue you can handle';
        valid = false; 
    }

    return valid;
}

function setVolunteerFieldError(fieldId, msg) {
    const errEl = document.getElementById('err-' + fieldId);
    if (errEl) errEl.textContent = msg;
    const fieldEl = document.getElementById(fieldId);
    if (fieldEl) fieldEl.closest('.form-field')?.classList.add('has-error');
}

function clearVolunteerErrors() {
    const form = document.getElementById('volunteer-form');
    if (!form) return;
    form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    form.querySelectorAll('.form-field.has-error').forEach(el => el.classList.remove('has-error'));
}

async function submitVolunteerForm() {
    const checkedIssues = [...document.querySelectorAll('input[name="vol-issue"]:checked')].map(cb => cb.value);

    const record = {
        name: document.getElementById('vol-name')?.value.trim() || '',
        age: parseInt(document.getElementById('vol-age')?.value || 0, 10),
        gender: document.getElementById('vol-gender')?.value || '',
        phone: document.getElementById('vol-phone')?.value.trim() || '',
        email: document.getElementById('vol-email')?.value.trim() || '',
        area: document.getElementById('vol-area')?.value || '',
        availability: document.getElementById('vol-availability')?.value || '',
        experience: document.getElementById('vol-experience')?.value || '',
        qualification: document.getElementById('vol-qualification')?.value.trim() || '',
        issues: checkedIssues.join(', '),
        bio: document.getElementById('vol-bio')?.value.trim() || ''
    };

    // Validate
    const validation = validators.validateVolunteer(record);
    if (!validation.valid) {
        validation.errors.forEach(err => console.warn('Validation error:', err));
        return;
    }

    try {
        // Save to localStorage
        VOLUNTEER_DATA = addVolunteerRecord(record);
        
        // Write to Firebase (if available)
        if (isFirebaseEnabled && isFirebaseConfigured()) {
            await writeToFirebase('volunteers', record);
            console.log('✅ Volunteer saved to Firebase and localStorage');
        } else {
            console.log('✅ Volunteer saved to localStorage');
        }

        // Show toast notification
        const toast = document.getElementById('volunteer-toast');
        if (toast) {
            toast.classList.add('visible');
            setTimeout(() => toast.classList.remove('visible'), 4000);
        }

        // Reset form
        document.getElementById('volunteer-form')?.reset();
        clearVolunteerErrors();
        renderVolunteerSection();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error submitting volunteer:', error);
        alert('Error saving volunteer. Please try again.');
    }
}

// ============================================================
// SEARCH & FILTER
// ============================================================

function setupSearch() {
    const input = document.getElementById('global-search');
    if (input) {
        input.addEventListener('input', () => {
            if (currentSection === 'data-table') applyTableFilters();
        });
    }
}

function setupTableSort() {
    document.querySelectorAll('table th').forEach(th => {
        th.addEventListener('click', () => {
            if (th.textContent === 'Actions') return;
            const newColumn = th.textContent.toLowerCase().replace(/\s+/g, '-');
            if (newColumn === sortColumn) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = newColumn;
                sortDirection = 'asc';
            }
            renderDataTable();
        });
    });
}

function setupFilterListeners() {
    ['filter-location', 'filter-issue', 'filter-education'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                currentPage = 1;
                applyTableFilters();
            });
        }
    });

    const clearBtn = document.getElementById('btn-clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            ['filter-location', 'filter-issue', 'filter-education'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const search = document.getElementById('global-search');
            if (search) search.value = '';
            currentPage = 1;
            applyTableFilters();
        });
    }

    ['analytics-location', 'analytics-issue'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => renderAnalytics());
        }
    });
}

function refreshFilterDropdowns() {
    const locations = unique(SURVEY_DATA, 'location');
    const issues = unique(SURVEY_DATA, 'issue');
    const educations = unique(SURVEY_DATA, 'education');

    const locationSelects = ['filter-location', 'analytics-location'];
    const issueSelects = ['filter-issue', 'analytics-issue'];
    const educationSelects = ['filter-education'];

    // Populate location dropdowns
    locationSelects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const prev = sel.value;
        sel.innerHTML = '<option value="">All Locations</option>';
        locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc;
            sel.appendChild(opt);
        });
        sel.value = prev;
    });

    // Populate issue dropdowns
    issueSelects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const prev = sel.value;
        sel.innerHTML = '<option value="">All Issues</option>';
        issues.forEach(iss => {
            const opt = document.createElement('option');
            opt.value = iss;
            opt.textContent = iss;
            sel.appendChild(opt);
        });
        sel.value = prev;
    });

    // Populate education dropdowns
    educationSelects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const prev = sel.value;
        sel.innerHTML = '<option value="">All Education</option>';
        educations.forEach(edu => {
            const opt = document.createElement('option');
            opt.value = edu;
            opt.textContent = edu;
            sel.appendChild(opt);
        });
        sel.value = prev;
    });
}

function applyTableFilters() {
    const searchTerm = (document.getElementById('global-search')?.value || '').toLowerCase();
    const locationFilter = document.getElementById('filter-location')?.value || '';
    const issueFilter = document.getElementById('filter-issue')?.value || '';
    const educationFilter = document.getElementById('filter-education')?.value || '';

    filteredData = SURVEY_DATA.filter(record => {
        const matchesSearch = !searchTerm || 
            record.name.toLowerCase().includes(searchTerm) ||
            record.location.toLowerCase().includes(searchTerm);
        
        const matchesLocation = !locationFilter || record.location === locationFilter;
        const matchesIssue = !issueFilter || String(record.issue || '').includes(issueFilter);
        const matchesEducation = !educationFilter || record.education === educationFilter;

        return matchesSearch && matchesLocation && matchesIssue && matchesEducation;
    });

    currentPage = 1;
    renderDataTable();
}

// ============================================================
// DATA TABLE RENDERING
// ============================================================

function renderDataTable() {
    const tableBody = document.querySelector('table tbody');
    const recordCount = document.querySelector('[class*="showing"]');
    
    if (!tableBody || !filteredData) return;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = filteredData.slice(start, end);

    tableBody.innerHTML = paginatedData.map((record, idx) => {
        const hasVerification = record.verificationImage && record.verificationCoords;
        const verificationBadge = hasVerification 
            ? `<span class="badge-verified btn-view-proof" data-id="${record.id}" style="background:rgba(16, 185, 129, 0.2); color:#10b981; border:1px solid #10b981; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="Click to view proof"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Verified</span>`
            : `<span style="color:#aaa; font-size:11px;">Unverified</span>`;

        return `
            <tr>
                <td>${record.id || idx + 1}</td>
                <td>${record.name}</td>
                <td>${record.age}</td>
                <td>${record.gender}</td>
                <td><span style="background:var(--accent-blue-glow);padding:4px 8px;border-radius:4px;">${record.location}</span></td>
                <td>${record.education}</td>
                <td><span style="background:var(--accent-emerald-glow);padding:4px 8px;border-radius:4px;">${record.issue}</span></td>
                <td>${formatters.formatDate(record.date)}</td>
                <td>${verificationBadge}</td>
                <td>
                    <button class="btn-delete-record" data-record-id="${record.id}" title="Delete this record">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Attach delete handlers
    tableBody.querySelectorAll('.btn-delete-record').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const recordId = parseInt(btn.dataset.recordId, 10);
            if (confirm('Delete this record?')) {
                SURVEY_DATA = deleteSurveyRecord(recordId);
                if (isFirebaseEnabled) {
                    const record = SURVEY_DATA.find(r => r.id === recordId);
                    if (record && record.firebaseId) {
                        await deleteFromFirebase(`surveys/${record.firebaseId}`);
                    }
                }
                applyTableFilters();
            }
        });
    });

    // Attach view proof handlers
    tableBody.querySelectorAll('.btn-view-proof').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const recordId = parseInt(e.currentTarget.dataset.id, 10);
            const record = SURVEY_DATA.find(r => r.id === recordId);
            if (record && record.verificationImage) {
                const modal = document.getElementById('verification-modal');
                const modalImg = document.getElementById('modal-img');
                const modalCoords = document.getElementById('modal-coords-text');
                
                if (modal && modalImg && modalCoords) {
                    modalImg.src = record.verificationImage;
                    modalCoords.textContent = `${record.verificationCoords.lat.toFixed(6)}, ${record.verificationCoords.lng.toFixed(6)}`;
                    modal.style.display = 'flex';
                }
            }
        });
    });

    if (recordCount) {
        recordCount.textContent = `Showing ${start + 1}–${Math.min(end, filteredData.length)} of ${filteredData.length} records`;
    }
}

// ============================================================
// OVERVIEW RENDERING
// ============================================================

function renderOverview() {
    const container = document.getElementById('section-overview');
    if (!container) return;

    if (!SURVEY_DATA.length) {
        const els = [
            { id: 'stat-total-val', val: '0' },
            { id: 'stat-villages-val', val: '0' },
            { id: 'stat-issues-val', val: '0' }
        ];
        els.forEach(el => {
            const e = document.getElementById(el.id);
            if (e) e.textContent = el.val;
        });
        return;
    }

    // Calculate statistics
    const locations = unique(SURVEY_DATA, 'location');
    const allIssues = SURVEY_DATA.flatMap(d => (d.issue || '').split(', ').filter(i => i));
    const issuesCount = new Set(allIssues).size;
    const totalResponses = SURVEY_DATA.length;

    // Update stat cards
    const stat1 = document.getElementById('stat-total-val');
    if (stat1) stat1.textContent = totalResponses;

    const stat2 = document.getElementById('stat-villages-val');
    if (stat2) stat2.textContent = locations.length;

    const stat3 = document.getElementById('stat-issues-val');
    if (stat3) stat3.textContent = issuesCount;

    // Render top issues donut chart
    renderOverviewIssueChart();
    renderOverviewTimelineChart();
}

function renderOverviewIssueChart() {
    const ctx = document.getElementById('overview-pie-chart');
    if (!ctx) return;

    // Collect all issues
    const issueMap = {};
    SURVEY_DATA.forEach(survey => {
        (survey.issue || '').split(', ').forEach(issue => {
            if (issue) issueMap[issue] = (issueMap[issue] || 0) + 1;
        });
    });

    const labels = Object.keys(issueMap);
    const data = Object.values(issueMap);

    if (charts['overview-issue']) charts['overview-issue'].destroy();
    charts['overview-issue'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: CHART_COLORS,
                borderColor: '#1a1a2e',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#aaa', padding: 15 } }
            }
        }
    });
}

function renderOverviewTimelineChart() {
    const ctx = document.getElementById('overview-line-chart');
    if (!ctx) return;

    // Group by date
    const dateMap = {};
    SURVEY_DATA.forEach(survey => {
        const date = survey.date || 'Unknown';
        dateMap[date] = (dateMap[date] || 0) + 1;
    });

    const labels = Object.keys(dateMap).sort();
    const data = labels.map(d => dateMap[d]);

    if (charts['overview-timeline']) charts['overview-timeline'].destroy();
    charts['overview-timeline'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Responses',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: '#6366f133',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#aaa' } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#aaa' } },
                x: { ticks: { color: '#aaa' } }
            }
        }
    });
}

// ============================================================
// ANALYTICS RENDERING
// ============================================================

function renderAnalytics() {
    // Populate location filter
    const locationSelect = document.getElementById('analytics-location');
    if (locationSelect && SURVEY_DATA.length > 0) {
        const currentVal = locationSelect.value;
        const locations = unique(SURVEY_DATA, 'location');
        const options = '<option value="">All Locations</option>' +
                        locations.map(l => `<option value="${l}">${l}</option>`).join('');
        locationSelect.innerHTML = options;
        locationSelect.value = currentVal || '';
    }

    // Populate issue filter
    const issueSelect = document.getElementById('analytics-issue');
    if (issueSelect && SURVEY_DATA.length > 0) {
        const currentVal = issueSelect.value;
        const allIssues = SURVEY_DATA.flatMap(d => (d.issue || '').split(', ').filter(i => i));
        const uniqueIssues = [...new Set(allIssues)];
        const options = '<option value="">All Issues</option>' +
                        uniqueIssues.map(i => `<option value="${i}">${i}</option>`).join('');
        issueSelect.innerHTML = options;
        issueSelect.value = currentVal || '';
    }

    const locationFilter = document.getElementById('analytics-location')?.value || '';
    const issueFilter = document.getElementById('analytics-issue')?.value || '';

    let filteredForAnalytics = SURVEY_DATA;
    if (locationFilter) {
        filteredForAnalytics = filteredForAnalytics.filter(d => d.location === locationFilter);
    }
    if (issueFilter) {
        filteredForAnalytics = filteredForAnalytics.filter(d => String(d.issue || '').includes(issueFilter));
    }

    if (!filteredForAnalytics.length) {
        ['analytics-pie-chart', 'analytics-line-chart', 'analytics-education-chart', 'analytics-age-chart'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.parentElement.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">No data to display</div>';
        });
        return;
    }

    renderAnalyticsPieChart(filteredForAnalytics);
    renderAnalyticsLineChart(filteredForAnalytics);
    renderAnalyticsEducationChart(filteredForAnalytics);
    renderAnalyticsAgeChart(filteredForAnalytics);
}

function renderAnalyticsPieChart(data) {
    const ctx = document.getElementById('analytics-pie-chart');
    if (!ctx) return;
    const issueMap = {};
    data.forEach(survey => {
        (survey.issue || '').split(', ').forEach(issue => {
            if (issue) issueMap[issue] = (issueMap[issue] || 0) + 1;
        });
    });
    const labels = Object.keys(issueMap);
    const values = Object.values(issueMap);
    if (charts['analytics-pie']) charts['analytics-pie'].destroy();
    charts['analytics-pie'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: values, backgroundColor: CHART_COLORS, borderColor: '#1a1a2e', borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { color: '#aaa', padding: 15 } } } }
    });
}

function renderAnalyticsLineChart(data) {
    const ctx = document.getElementById('analytics-line-chart');
    if (!ctx) return;
    const dateMap = {};
    data.forEach(survey => {
        const date = survey.date || 'Unknown';
        dateMap[date] = (dateMap[date] || 0) + 1;
    });
    const labels = Object.keys(dateMap).sort();
    const values = labels.map(d => dateMap[d]);
    if (charts['analytics-line']) charts['analytics-line'].destroy();
    charts['analytics-line'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Responses', data: values, borderColor: '#8b5cf6', backgroundColor: '#8b5cf633', borderWidth: 2, fill: true }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#aaa' } } }, scales: { y: { beginAtZero: true, ticks: { color: '#aaa' } }, x: { ticks: { color: '#aaa' } } } }
    });
}

function renderAnalyticsEducationChart(data) {
    const ctx = document.getElementById('analytics-education-chart');
    if (!ctx) return;
    const locationMap = {};
    data.forEach(survey => {
        locationMap[survey.location] = (locationMap[survey.location] || 0) + 1;
    });
    const labels = Object.keys(locationMap);
    const values = Object.values(locationMap);
    if (charts['analytics-education']) charts['analytics-education'].destroy();
    charts['analytics-education'] = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: labels,
            datasets: [{ data: values, backgroundColor: CHART_COLORS_ALPHA, borderColor: CHART_COLORS, borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { color: '#aaa' } } } }
    });
}

function renderAnalyticsAgeChart(data) {
    const ctx = document.getElementById('analytics-age-chart');
    if (!ctx) return;
    const genderMap = {};
    data.forEach(survey => {
        genderMap[survey.gender] = (genderMap[survey.gender] || 0) + 1;
    });
    const labels = Object.keys(genderMap);
    const values = Object.values(genderMap);
    if (charts['analytics-age']) charts['analytics-age'].destroy();
    charts['analytics-age'] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{ label: 'Distribution', data: values, borderColor: '#ec4899', backgroundColor: '#ec489933', borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#aaa' } } }, scales: { r: { ticks: { color: '#aaa' }, grid: { color: '#333' } } } }
    });
}

// ============================================================
// PATTERNS RENDERING
// ============================================================

function renderPatterns() {
    const container = document.getElementById('patterns-container');
    if (!container) return;

    if (SURVEY_DATA.length < 2) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">📊 Need at least 2 survey entries to detect patterns</div>';
        return;
    }

    // Analyze patterns
    const patterns = [];

    // 1. Most common issues
    const issueFreq = {};
    SURVEY_DATA.forEach(survey => {
        (survey.issue || '').split(', ').forEach(issue => {
            if (issue) issueFreq[issue] = (issueFreq[issue] || 0) + 1;
        });
    });
    const topIssues = Object.entries(issueFreq).sort((a, b) => b[1] - a[1]).slice(0, 3);
    patterns.push({
        emoji: '⚠️',
        title: 'Top Issues',
        content: topIssues.length ? topIssues.map(i => `${i[0]} (${i[1]})`).join(', ') : 'No issues recorded'
    });

    // 2. Location distribution
    const locationFreq = {};
    SURVEY_DATA.forEach(survey => {
        locationFreq[survey.location] = (locationFreq[survey.location] || 0) + 1;
    });
    const avgPerLocation = Object.entries(locationFreq).map(e => e[1]).reduce((a, b) => a + b, 0) / Object.keys(locationFreq).length;
    patterns.push({
        emoji: '📍',
        title: 'Location Spread',
        content: `${Object.keys(locationFreq).length} areas with avg ${avgPerLocation.toFixed(1)} surveys each`
    });

    // 3. Gender distribution
    const genderFreq = {};
    SURVEY_DATA.forEach(survey => {
        genderFreq[survey.gender] = (genderFreq[survey.gender] || 0) + 1;
    });
    const dominantGender = Object.entries(genderFreq).sort((a, b) => b[1] - a[1])[0];
    patterns.push({
        emoji: '👥',
        title: 'Demographics',
        content: dominantGender ? `${dominantGender[0]} leads with ${dominantGender[1]} responses` : 'No gender data'
    });

    // 4. Age insights
    const ages = SURVEY_DATA.map(s => s.age).filter(a => a);
    if (ages.length > 0) {
        const avgAge = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
        const minAge = Math.min(...ages);
        const maxAge = Math.max(...ages);
        patterns.push({
            emoji: '📈',
            title: 'Age Insights',
            content: `Range: ${minAge}-${maxAge} yrs, Avg: ${avgAge} yrs`
        });
    }

    // 5. Priority ranking (surveys with most issues)
    const surveyIssueCount = SURVEY_DATA.map(s => ({
        name: s.name,
        issueCount: (s.issue || '').split(', ').filter(i => i).length
    })).sort((a, b) => b.issueCount - a.issueCount);
    if (surveyIssueCount.length > 0) {
        const topHighPriority = surveyIssueCount.filter(s => s.issueCount >= Math.max(...surveyIssueCount.map(x => x.issueCount))).slice(0, 3);
        patterns.push({
            emoji: '🔴',
            title: 'High Priority Cases',
            content: topHighPriority.map(s => `${s.name} (${s.issueCount} issues)`).join(', ')
        });
    }

    container.innerHTML = patterns.map((p, i) => `
        <div class="pattern-card" style="animation-delay: ${i * 0.1}s;">
            <div class="pattern-icon">${p.emoji}</div>
            <div class="pattern-content">
                <h4>${p.title}</h4>
                <p>${p.content}</p>
            </div>
        </div>
    `).join('');

    // Add styles if not already present
    if (!document.getElementById('pattern-styles')) {
        const style = document.createElement('style');
        style.id = 'pattern-styles';
        style.textContent = `
            .pattern-card {
                background: linear-gradient(135deg, #1e1e2e 0%, #2d2d3e 100%);
                border: 1px solid #3a3a4e;
                border-radius: 12px;
                padding: 20px;
                display: flex;
                gap: 15px;
                align-items: flex-start;
                animation: slideIn 0.3s ease-out forwards;
                opacity: 0;
                margin-bottom: 15px;
            }
            .pattern-icon { font-size: 28px; }
            .pattern-content { flex: 1; }
            .pattern-content h4 { color: #fff; margin: 0 0 8px 0; font-size: 16px; }
            .pattern-content p { color: #aaa; margin: 0; font-size: 13px; }
            @keyframes slideIn {
                from { opacity: 0; transform: translateX(-10px); }
                to { opacity: 1; transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================================
// VOLUNTEER SECTION
// ============================================================

function updateLocationSuggestions() {
    // Location dropdown is static, no suggestions needed
}

function renderVolunteerSection() {
    renderVolunteerCards();
}

function renderVolunteerCards() {
    const container = document.getElementById('volunteer-cards');
    const countEl = document.getElementById('volunteer-count');
    
    if (!container || !countEl) return;

    countEl.textContent = `${VOLUNTEER_DATA.length} volunteer${VOLUNTEER_DATA.length !== 1 ? 's' : ''}`;

    if (!VOLUNTEER_DATA.length) {
        container.innerHTML = `
            <div class="volunteer-empty-state">
                <div class="empty-state-icon">🧑‍🤝‍🧑</div>
                <h4>No volunteers registered yet</h4>
                <p>Fill in the form above to register as a service provider.</p>
            </div>`;
        return;
    }

    container.innerHTML = VOLUNTEER_DATA.map((v, i) => {
        const initials = v.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        const issuesList = (v.issues || '').split(',').map(iss => `<span style="background:var(--accent-emerald-glow);padding:2px 6px;border-radius:4px;font-size:11px;">${iss.trim()}</span>`).join(' ');
        return `
            <div class="volunteer-card" style="animation-delay: ${i * 0.05}s">
                <div class="volunteer-card-top">
                    <div class="volunteer-avatar">${initials}</div>
                    <div>
                        <div class="volunteer-card-name">${v.name}</div>
                        <div class="volunteer-card-meta">${v.gender}, ${v.age} yrs${v.qualification ? ' • ' + v.qualification : ''}</div>
                        <div style="margin-top:5px;font-size:12px;color:#aaa;">📍 ${v.area} | ⏳ ${v.availability} | 🌟 ${v.experience}</div>
                        <div style="margin-top:2px;font-size:12px;color:#aaa;">📞 ${v.phone} ${v.email ? '| ✉️ ' + v.email : ''}</div>
                    </div>
                </div>
                <div style="margin: 10px 0; font-size:13px; color:#ddd;">
                    ${v.bio ? `<p style="margin-bottom:8px;"><i>"${v.bio}"</i></p>` : ''}
                    <div><b>Can handle:</b> ${issuesList}</div>
                </div>
                <div class="volunteer-card-actions" style="margin-top:auto;">
                    <button class="btn-delete-volunteer" data-vol-id="${v.id}" title="Remove">Delete</button>
                </div>
            </div>`;
    }).join('');

    container.querySelectorAll('.btn-delete-volunteer').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const volId = parseInt(btn.dataset.volId, 10);
            if (confirm('Delete this volunteer?')) {
                VOLUNTEER_DATA = deleteVolunteerRecord(volId);
                renderVolunteerCards();
            }
        });
    });
}

// ============================================================
// ASSIGNMENTS RENDERING
// ============================================================
function renderAssignments() {
    const container = document.getElementById('assignments-list');
    const tabUnassigned = document.getElementById('tab-unassigned');
    const tabAssigned = document.getElementById('tab-assigned');
    
    if (!container) return;

    // Attach tab listeners if not attached
    if (tabUnassigned && !tabUnassigned.hasAttribute('data-listener')) {
        tabUnassigned.setAttribute('data-listener', 'true');
        tabUnassigned.addEventListener('click', () => {
            currentAssignmentTab = 'unassigned';
            tabUnassigned.classList.add('active');
            if (tabAssigned) tabAssigned.classList.remove('active');
            renderAssignments();
        });
    }
    
    if (tabAssigned && !tabAssigned.hasAttribute('data-listener')) {
        tabAssigned.setAttribute('data-listener', 'true');
        tabAssigned.addEventListener('click', () => {
            currentAssignmentTab = 'assigned';
            tabAssigned.classList.add('active');
            if (tabUnassigned) tabUnassigned.classList.remove('active');
            renderAssignments();
        });
    }

    if (currentAssignmentTab === 'assigned') {
        renderAssignedTasks(container);
        return;
    }

    // Filter out already assigned surveys
    const assignedSurveyIds = ASSIGNMENT_DATA.map(a => a.surveyId);
    const unassignedSurveys = SURVEY_DATA.filter(s => !assignedSurveyIds.includes(s.id));

    if (!unassignedSurveys.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">📋 No unassigned survey data available</div>';
        return;
    }

    // Prioritization based on frequency of issue types across all SURVEY_DATA
    const globalIssueFreq = {};
    SURVEY_DATA.forEach(s => {
        (s.issue || '').split(',').forEach(i => {
            const trimmed = i.trim();
            if (trimmed) {
                globalIssueFreq[trimmed] = (globalIssueFreq[trimmed] || 0) + 1;
            }
        });
    });

    // Sort unassigned surveys by the sum of their issue frequencies
    const prioritizedSurveys = unassignedSurveys.map(survey => {
        const issues = (survey.issue || '').split(',').map(i => i.trim()).filter(i => i);
        let freqScore = 0;
        issues.forEach(i => freqScore += (globalIssueFreq[i] || 0));
        return {
            ...survey,
            freqScore: freqScore,
            issueCount: issues.length
        };
    }).sort((a, b) => b.freqScore - a.freqScore);

    // Group by priority level based on freqScore
    const maxScore = prioritizedSurveys.length > 0 ? prioritizedSurveys[0].freqScore : 0;
    const critical = prioritizedSurveys.filter(s => s.freqScore >= maxScore * 0.8 && s.freqScore > 0);
    const high = prioritizedSurveys.filter(s => s.freqScore >= maxScore * 0.4 && s.freqScore < maxScore * 0.8);
    const medium = prioritizedSurveys.filter(s => s.freqScore < maxScore * 0.4 || s.freqScore === 0);

    let html = '';

    if (critical.length > 0) {
        html += '<div class="priority-group" style="margin-bottom: 30px;">';
        html += '<div class="priority-header" style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">';
        html += '<span style="color:#f43f5e;font-size:20px;">🔴</span>';
        html += '<h3 style="color:#f43f5e;margin:0;font-size:16px;">CRITICAL PRIORITY (' + critical.length + ')</h3>';
        html += '</div>';
        html += critical.map(s => renderAssignmentCard(s, '#f43f5e')).join('');
        html += '</div>';
    }

    if (high.length > 0) {
        html += '<div class="priority-group" style="margin-bottom: 30px;">';
        html += '<div class="priority-header" style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">';
        html += '<span style="color:#f59e0b;font-size:20px;">🟠</span>';
        html += '<h3 style="color:#f59e0b;margin:0;font-size:16px;">HIGH PRIORITY (' + high.length + ')</h3>';
        html += '</div>';
        html += high.map(s => renderAssignmentCard(s, '#f59e0b')).join('');
        html += '</div>';
    }

    if (medium.length > 0) {
        html += '<div class="priority-group" style="margin-bottom: 30px;">';
        html += '<div class="priority-header" style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">';
        html += '<span style="color:#10b981;font-size:20px;">🟢</span>';
        html += '<h3 style="color:#10b981;margin:0;font-size:16px;">MEDIUM PRIORITY (' + medium.length + ')</h3>';
        html += '</div>';
        html += medium.map(s => renderAssignmentCard(s, '#10b981')).join('');
        html += '</div>';
    }

    container.innerHTML = html;

    // Attach listeners to Assign buttons
    container.querySelectorAll('.btn-assign').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const surveyId = parseInt(e.target.dataset.surveyId, 10);
            const volId = parseInt(e.target.dataset.volId, 10);
            handleAssignTask(surveyId, volId);
        });
    });
}

function renderAssignmentCard(survey, priorityColor) {
    const issues = (survey.issue || '').split(',').map(i => i.trim()).filter(i => i);
    
    // Match based on both area and issues
    const matchedVolunteers = VOLUNTEER_DATA.filter(v => {
        const isAreaMatch = v.area === survey.location;
        const volIssues = (v.issues || '').split(',').map(i => i.trim()).filter(i => i);
        const hasMatchingIssue = issues.some(issue => volIssues.includes(issue));
        return isAreaMatch && hasMatchingIssue;
    });

    const issueCount = issues.length;
    const volunteerCount = matchedVolunteers.length;
    
    let volunteersHtml = '';
    if (volunteerCount > 0) {
        volunteersHtml = `<div style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;">
            <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">Available Volunteers (${volunteerCount}):</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${matchedVolunteers.map(v => `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
                        <div>
                            <div style="font-size: 13px; font-weight: bold; color: #fff;">${v.name}</div>
                            <div style="font-size: 11px; color: #999;">${v.phone} • ${v.availability}</div>
                        </div>
                        <button class="btn btn-primary btn-assign" data-survey-id="${survey.id}" data-vol-id="${v.id}" style="padding: 4px 10px; font-size: 12px;">Assign</button>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    return `
        <div class="assignment-card" style="
            background: linear-gradient(135deg, #1e1e2e 0%, #2d2d3e 100%);
            border-left: 4px solid ${priorityColor};
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        ">
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 15px; align-items: start;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span style="color: ${priorityColor}; font-weight: bold;">${survey.name}</span>
                        <span style="background: ${priorityColor}33; color: ${priorityColor}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Score: ${survey.freqScore || 0}</span>
                    </div>
                    <div style="color: #aaa; font-size: 12px;">${survey.location} • Age ${survey.age}</div>
                    <div style="color: #999; font-size: 11px; margin-top: 5px;">Issues: ${issues.join(', ')}</div>
                </div>
                <div style="text-align: right;">
                    ${volunteerCount > 0 
                        ? `<div style="color: #10b981; font-weight: bold; font-size: 18px;">${volunteerCount}</div>
                           <div style="color: #aaa; font-size: 12px;">Matched</div>` 
                        : `<div style="color: #f59e0b; font-weight: bold; font-size: 18px;">0</div>
                           <div style="color: #aaa; font-size: 12px;">Matched</div>`}
                </div>
            </div>
            ${volunteersHtml}
        </div>
    `;
}

function handleAssignTask(surveyId, volId) {
    const survey = SURVEY_DATA.find(s => s.id === surveyId);
    const volunteer = VOLUNTEER_DATA.find(v => v.id === volId);
    if (!survey || !volunteer) return;
    
    ASSIGNMENT_DATA = addAssignmentRecord({
        surveyId: survey.id,
        volunteerId: volunteer.id,
        surveyName: survey.name,
        volunteerName: volunteer.name,
        location: survey.location,
        issues: survey.issue
    });
    
    renderAssignments();
    
    const toast = document.createElement('div');
    toast.className = 'form-toast visible';
    toast.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> <span>Task assigned to ${volunteer.name}!</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function renderAssignedTasks(container) {
    if (!ASSIGNMENT_DATA.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">📋 No assigned tasks</div>';
        return;
    }

    container.innerHTML = ASSIGNMENT_DATA.map(assignment => `
        <div class="assignment-card" style="
            background: linear-gradient(135deg, #1e1e2e 0%, #2d2d3e 100%);
            border-left: 4px solid #10b981;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <div>
                <div style="color: #fff; font-weight: bold; margin-bottom: 5px;">Survey: ${assignment.surveyName}</div>
                <div style="color: #aaa; font-size: 12px;">Assigned to: <span style="color:#6366f1;">${assignment.volunteerName}</span></div>
                <div style="color: #999; font-size: 11px; margin-top: 5px;">Location: ${assignment.location} | Issues: ${assignment.issues}</div>
                <div style="color: #666; font-size: 11px; margin-top: 5px;">Assigned On: ${formatters.formatDate(assignment.assignedOn)}</div>
            </div>
            <button class="btn btn-secondary btn-unassign" data-id="${assignment.id}" style="padding: 6px 12px; font-size: 12px; border-color: #ef4444; color: #ef4444;">Unassign</button>
        </div>
    `).join('');

    container.querySelectorAll('.btn-unassign').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id, 10);
            if (confirm('Are you sure you want to unassign this task?')) {
                ASSIGNMENT_DATA = deleteAssignmentRecord(id);
                renderAssignments();
            }
        });
    });
}

// ============================================================
// RESET DATA
// ============================================================

function setupResetButton() {
    const resetBtn = document.getElementById('btn-reset-data');
    if (!resetBtn) return;

    let confirmPending = false;

    resetBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (!confirmPending) {
            confirmPending = true;
            resetBtn.textContent = 'Click Again to Confirm';
            resetBtn.style.background = 'rgba(244, 63, 94, 0.2)';
            resetBtn.style.borderColor = 'rgba(244, 63, 94, 0.5)';

            setTimeout(function () {
                if (confirmPending) {
                    confirmPending = false;
                    resetBtn.textContent = 'Reset Data';
                    resetBtn.style.background = '';
                    resetBtn.style.borderColor = '';
                }
            }, 3000);
        } else {
            confirmPending = false;
            SURVEY_DATA = [];
            VOLUNTEER_DATA = [];
            ASSIGNMENT_DATA = [];
            
            const key1 = 'surveylens_data';
            const key2 = 'surveylens_volunteers';
            const key3 = 'surveylens_assignments';
            localStorage.removeItem(key1);
            localStorage.removeItem(key2);
            localStorage.removeItem(key3);

            resetBtn.textContent = 'Reset Data';
            resetBtn.style.background = '';
            resetBtn.style.borderColor = '';

            updateSidebarCount();
            refreshFilterDropdowns();
            renderSection(currentSection);
        }
    });
}

// ============================================================
// CLEANUP & UNSUBSCRIBE
// ============================================================

window.addEventListener('beforeunload', () => {
    if (surveyListener) surveyListener();
    if (volunteerListener) volunteerListener();
    console.log('🛑 Firebase listeners unsubscribed');
});

// ============================================================
// START APPLICATION
// ============================================================

// Wait for DOM to load, then initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
