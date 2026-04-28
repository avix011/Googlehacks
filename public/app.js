// ============================================================
// SurveyLens Dashboard — Main Application Logic
// ============================================================

(function () {
    'use strict';

    // ---- State ----
    let currentSection = 'add-survey';
    let filteredData = [...SURVEY_DATA];
    let sortColumn = 'id';
    let sortDirection = 'asc';
    let currentPage = 1;
    const rowsPerPage = 12;

    // ---- Chart instances ----
    const charts = {};

    // ---- Color palette for charts ----
    const CHART_COLORS = [
        '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
        '#10b981', '#06b6d4', '#f43f5e', '#84cc16',
        '#a855f7', '#14b8a6', '#e11d48', '#facc15'
    ];

    const CHART_COLORS_ALPHA = CHART_COLORS.map(c => c + '33');

    // ============================================================
    // UTILITY HELPERS
    // ============================================================
    function unique(arr, key) {
        if (key === 'issue') {
            // issue can be comma-separated "Health, Water" — flatten
            const all = [];
            arr.forEach(d => {
                String(d.issue).split(',').forEach(i => {
                    const trimmed = i.trim();
                    if (trimmed) all.push(trimmed);
                });
            });
            return [...new Set(all)].sort();
        }
        return [...new Set(arr.map(d => d[key]))].sort();
    }

    function countBy(arr, key) {
        const map = {};
        if (key === 'issue') {
            arr.forEach(d => {
                String(d.issue).split(',').forEach(i => {
                    const trimmed = i.trim();
                    if (trimmed) map[trimmed] = (map[trimmed] || 0) + 1;
                });
            });
        } else {
            arr.forEach(d => { map[d[key]] = (map[d[key]] || 0) + 1; });
        }
        return map;
    }

    function avgBy(arr, key) {
        if (!arr.length) return 0;
        return Math.round(arr.reduce((s, d) => s + d[key], 0) / arr.length);
    }

    function formatCurrency(n) {
        return '₹' + n.toLocaleString('en-IN');
    }

    function animateValue(el, end, prefix = '', duration = 800) {
        const start = 0;
        const range = end - start;
        const startTime = performance.now();
        function update(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + range * eased);
            el.textContent = prefix + current.toLocaleString('en-IN');
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    function refreshData() {
        SURVEY_DATA = loadSurveyData();
        filteredData = [...SURVEY_DATA];
        updateSidebarCount();
        refreshFilterDropdowns();
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        // Clear old pre-loaded data on first run of updated version
        clearOldPreData();

        refreshFilterDropdowns();
        setupNavigation();
        setupSearch();
        setupTableSort();
        setupFilterListeners();
        setupMobileMenu();
        setupSurveyForm();
        setupVolunteerForm();
        setupResetButton();
        updateSidebarCount();
        updateLocationSuggestions();
        setDefaultDate();
        renderSection('add-survey');
    }

    /** One-time migration: clear any old seed data from previous version */
    function clearOldPreData() {
        const migrationKey = 'surveylens_v2_migrated';
        if (!localStorage.getItem(migrationKey)) {
            localStorage.removeItem(STORAGE_KEY);
            SURVEY_DATA = loadSurveyData(); // returns []
            localStorage.setItem(migrationKey, '1');
        }
    }

    function updateSidebarCount() {
        document.getElementById('record-count-sidebar').textContent =
            `${SURVEY_DATA.length} records loaded`;
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

                document.getElementById('sidebar').classList.remove('open');
            });
        });
    }

    function setupMobileMenu() {
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
        document.getElementById('main-content').addEventListener('click', (e) => {
            // Only close sidebar on mobile, and don't interfere with sidebar buttons
            if (!e.target.closest('.sidebar')) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
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
        document.getElementById('page-title').textContent = title;
        document.getElementById('page-subtitle').textContent = subtitle;

        const sectionEl = document.getElementById('section-' + section);
        if (sectionEl) sectionEl.classList.add('active');

        if (section !== 'add-survey') refreshData();

        switch (section) {
            case 'add-survey': updateLocationSuggestions(); break;
            case 'volunteer':  renderVolunteerSection(); break;
            case 'assignments':renderAssignments(); break;
            case 'overview':   renderOverview(); break;
            case 'data-table': renderDataTable(); break;
            case 'analytics':  renderAnalytics(); break;
            case 'patterns':   renderPatterns(); break;
        }
    }

    // ============================================================
    // SURVEY FORM
    // ============================================================
    function setDefaultDate() {
        const dateField = document.getElementById('field-date');
        if (dateField) dateField.value = new Date().toISOString().split('T')[0];
    }

    function updateLocationSuggestions() {
        // Location is now a static select dropdown, no datalist needed.
    }

    function setupSurveyForm() {
        const form = document.getElementById('survey-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateForm()) submitForm();
        });

        form.addEventListener('reset', () => {
            setTimeout(() => {
                clearFormErrors();
                setDefaultDate();
                document.getElementById('form-toast').classList.remove('visible');
            }, 10);
        });

        // Live clear errors on input
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

        // Clear issue error when any checkbox changes
        document.querySelectorAll('input[name="issue"]').forEach(cb => {
            cb.addEventListener('change', () => {
                document.getElementById('err-issue').textContent = '';
            });
        });
    }

    function validateForm() {
        let valid = true;
        clearFormErrors();

        const name = document.getElementById('field-name').value.trim();
        const age = document.getElementById('field-age').value;
        const gender = document.getElementById('field-gender').value;
        const location = document.getElementById('field-location').value;
        const date = document.getElementById('field-date').value;
        const checkedIssues = document.querySelectorAll('input[name="issue"]:checked');

        if (!name) { setFieldError('name', 'Name is required'); valid = false; }
        if (!age || age < 1 || age > 120) { setFieldError('age', 'Enter a valid age (1–120)'); valid = false; }
        if (!gender) { setFieldError('gender', 'Select a gender'); valid = false; }
        if (!location) { setFieldError('location', 'Select a village or area'); valid = false; }
        if (!date) { setFieldError('date', 'Survey date is missing'); valid = false; }
        if (!checkedIssues.length) { document.getElementById('err-issue').textContent = 'Select at least one issue'; valid = false; }

        return valid;
    }

    function setFieldError(fieldName, msg) {
        const errEl = document.getElementById('err-' + fieldName);
        if (errEl) errEl.textContent = msg;
        const fieldEl = document.getElementById('field-' + fieldName);
        if (fieldEl) fieldEl.closest('.form-field')?.classList.add('has-error');
    }

    function clearFormErrors() {
        document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-field.has-error').forEach(el => el.classList.remove('has-error'));
    }

    function submitForm() {
        // Collect all checked issues as comma-separated string
        const checkedIssues = [...document.querySelectorAll('input[name="issue"]:checked')].map(cb => cb.value);

        const record = {
            name: document.getElementById('field-name').value.trim(),
            age: parseInt(document.getElementById('field-age').value, 10),
            gender: document.getElementById('field-gender').value,
            location: document.getElementById('field-location').value,
            education: "Not provided",
            date: document.getElementById('field-date').value,
            issue: checkedIssues.join(', '),
            notes: document.getElementById('field-notes').value.trim()
        };

        SURVEY_DATA = addSurveyRecord(record);
        updateSidebarCount();
        updateLocationSuggestions();

        const toast = document.getElementById('form-toast');
        toast.classList.add('visible');

        document.getElementById('survey-form').reset();
        setDefaultDate();
        clearFormErrors();

        setTimeout(() => { toast.classList.remove('visible'); }, 4000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                // First click — ask for confirmation
                confirmPending = true;
                resetBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg> Click Again to Confirm';
                resetBtn.style.background = 'rgba(244, 63, 94, 0.2)';
                resetBtn.style.borderColor = 'rgba(244, 63, 94, 0.5)';

                // Auto-cancel after 3s
                setTimeout(function () {
                    if (confirmPending) {
                        confirmPending = false;
                        resetBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg> Reset Data';
                        resetBtn.style.background = '';
                        resetBtn.style.borderColor = '';
                    }
                }, 3000);
            } else {
                // Second click — confirmed, reset everything
                confirmPending = false;
                localStorage.removeItem(STORAGE_KEY);
                SURVEY_DATA = loadSurveyData();
                filteredData = [];
                updateSidebarCount();
                refreshFilterDropdowns();
                updateLocationSuggestions();

                resetBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg> Reset Data';
                resetBtn.style.background = '';
                resetBtn.style.borderColor = '';

                // Re-render current section
                document.querySelectorAll('.content-section').forEach(function (s) { s.classList.remove('active'); });
                renderSection(currentSection);
            }
        });
    }


    // ============================================================
    // ASSIGNMENTS
    // ============================================================
    let currentAssignmentTab = 'unassigned';

    function renderAssignments() {
        const list = document.getElementById('assignments-list');
        if (!list) return;

        VOLUNTEER_DATA = loadVolunteerData();

        const tabUnassigned = document.getElementById('tab-unassigned');
        const tabAssigned = document.getElementById('tab-assigned');

        if (tabUnassigned && tabAssigned) {
            tabUnassigned.onclick = () => {
                currentAssignmentTab = 'unassigned';
                tabUnassigned.classList.add('active');
                tabAssigned.classList.remove('active');
                renderAssignmentsList();
            };

            tabAssigned.onclick = () => {
                currentAssignmentTab = 'assigned';
                tabAssigned.classList.add('active');
                tabUnassigned.classList.remove('active');
                renderAssignmentsList();
            };
        }

        renderAssignmentsList();
    }

    function renderAssignmentsList() {
        const list = document.getElementById('assignments-list');
        if (!list) return;

        const isAssignedTab = currentAssignmentTab === 'assigned';
        const surveys = SURVEY_DATA.filter(s => !!s.assignedVolunteerId === isAssignedTab);

        if (!surveys.length) {
            list.innerHTML = `<div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <h3>No ${isAssignedTab ? 'assigned' : 'unassigned'} issues found</h3>
                <p>All clear for now!</p>
            </div>`;
            return;
        }

        list.innerHTML = surveys.map((s, i) => {
            const issues = String(s.issue).split(',').map(iss => iss.trim()).filter(Boolean);
            
            // Find matched volunteers
            const matchedVolunteers = VOLUNTEER_DATA.filter(v => {
                const vAreas = v.area.toLowerCase().split(',').map(a => a.trim());
                const vIssues = String(v.issues).split(',').map(iss => iss.trim());
                
                const areaMatch = vAreas.includes(s.location.toLowerCase());
                const issueMatch = issues.some(iss => vIssues.includes(iss));
                
                return areaMatch && issueMatch;
            });

            let actionHtml = '';
            
            if (!isAssignedTab) {
                if (matchedVolunteers.length > 0) {
                    actionHtml = `
                        <div class="assign-action" style="display:flex; gap:10px; align-items:center;">
                            <select class="assign-select" id="assign-select-${s.id}" style="padding:8px; border-radius:6px; border:1px solid var(--border-subtle); background:var(--bg-card); color:var(--text-primary);">
                                <option value="" disabled selected>Select Volunteer to Assign</option>
                                ${matchedVolunteers.map(v => `<option value="${v.id}">${v.name} (${v.availability})</option>`).join('')}
                            </select>
                            <button class="btn btn-primary btn-assign" data-survey-id="${s.id}" style="padding:8px 16px;">Assign</button>
                        </div>
                    `;
                } else {
                    actionHtml = `<div class="no-match-warning" style="color:var(--accent-amber); font-size:0.85rem; font-weight:600;">⚠️ No matching volunteer available for this location & issues.</div>`;
                }
            } else {
                const assignedVol = VOLUNTEER_DATA.find(v => v.id === s.assignedVolunteerId);
                actionHtml = `
                    <div class="assigned-info" style="display:flex; justify-content:space-between; align-items:center; background:var(--accent-emerald-glow); padding:10px 15px; border-radius:8px; border:1px solid rgba(16,185,129,0.2);">
                        <span style="color:var(--accent-emerald); font-weight:600;">Assigned to: ${assignedVol ? assignedVol.name : 'Unknown'}</span>
                        <button class="btn btn-secondary btn-unassign" data-survey-id="${s.id}" style="padding:6px 12px; font-size:0.8rem; border-color:var(--accent-rose); color:var(--accent-rose);">Unassign</button>
                    </div>
                `;
            }

            return `
            <div class="assignment-card" style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:20px; margin-bottom:16px; animation:fadeIn 0.3s ease ${i * 0.05}s both;">
                <div class="assignment-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                    <div>
                        <h4 style="margin:0 0 4px 0; font-size:1.1rem; color:var(--text-primary);">Survey #${s.id} - ${s.name}</h4>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${s.gender}, ${s.age} yrs</div>
                    </div>
                    <span class="location-badge" style="background:rgba(99,102,241,0.1); color:var(--accent-blue); padding:4px 10px; border-radius:20px; font-size:0.8rem; font-weight:600; border:1px solid rgba(99,102,241,0.2);">📍 ${s.location}</span>
                </div>
                <div class="assignment-issues" style="margin-bottom:16px;">
                    <strong style="font-size:0.85rem; color:var(--text-secondary); margin-right:8px;">Issues:</strong>
                    ${issues.map(iss => `<span class="issue-tag ${iss.toLowerCase()}" style="display:inline-block; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; margin-right:4px;">${iss}</span>`).join('')}
                </div>
                <div class="assignment-actions" style="border-top:1px solid var(--border-subtle); padding-top:16px;">
                    ${actionHtml}
                </div>
            </div>`;
        }).join('');

        // Attach assign handlers
        if (!isAssignedTab) {
            list.querySelectorAll('.btn-assign').forEach(btn => {
                btn.addEventListener('click', () => {
                    const sid = parseInt(btn.dataset.surveyId, 10);
                    const sel = document.getElementById(`assign-select-${sid}`);
                    if (!sel.value) return;
                    
                    const vid = parseInt(sel.value, 10);
                    assignSurvey(sid, vid);
                });
            });
        } else {
            list.querySelectorAll('.btn-unassign').forEach(btn => {
                btn.addEventListener('click', () => {
                    const sid = parseInt(btn.dataset.surveyId, 10);
                    assignSurvey(sid, null);
                });
            });
        }
    }

    function assignSurvey(surveyId, volunteerId) {
        const survey = SURVEY_DATA.find(s => s.id === surveyId);
        if (survey) {
            survey.assignedVolunteerId = volunteerId;
            saveSurveyData(SURVEY_DATA);
            renderAssignmentsList();
        }
    }

    // ============================================================
    // VOLUNTEER FORM
    // ============================================================
    function setupVolunteerForm() {
        const form = document.getElementById('volunteer-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateVolunteerForm()) submitVolunteerForm();
        });

        form.addEventListener('reset', () => {
            setTimeout(() => {
                clearVolunteerErrors();
                document.getElementById('volunteer-toast').classList.remove('visible');
            }, 10);
        });

        // Live clear errors
        ['vol-name', 'vol-age', 'vol-gender', 'vol-phone', 'vol-email', 'vol-area', 'vol-availability', 'vol-experience'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    el.closest('.form-field')?.classList.remove('has-error');
                    const errEl = document.getElementById('err-' + id);
                    if (errEl) errEl.textContent = '';
                });
            }
        });

        // Clear issue error on checkbox change
        document.querySelectorAll('input[name="vol-issue"]').forEach(cb => {
            cb.addEventListener('change', () => {
                document.getElementById('err-vol-issue').textContent = '';
            });
        });
    }

    function validateVolunteerForm() {
        let valid = true;
        clearVolunteerErrors();

        const name = document.getElementById('vol-name').value.trim();
        const age = document.getElementById('vol-age').value;
        const gender = document.getElementById('vol-gender').value;
        const phone = document.getElementById('vol-phone').value.trim();
        const email = document.getElementById('vol-email').value.trim();
        const area = document.getElementById('vol-area').value.trim();
        const availability = document.getElementById('vol-availability').value;
        const experience = document.getElementById('vol-experience').value;
        const checkedIssues = document.querySelectorAll('input[name="vol-issue"]:checked');

        if (!name) { setVolFieldError('vol-name', 'Name is required'); valid = false; }
        if (!age || age < 16 || age > 80) { setVolFieldError('vol-age', 'Enter a valid age (16–80)'); valid = false; }
        if (!gender) { setVolFieldError('vol-gender', 'Select a gender'); valid = false; }
        if (!phone || phone.length < 10) { setVolFieldError('vol-phone', 'Enter a valid phone number'); valid = false; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setVolFieldError('vol-email', 'Enter a valid email'); valid = false; }
        if (!area) { setVolFieldError('vol-area', 'Enter area(s) you handle'); valid = false; }
        if (!availability) { setVolFieldError('vol-availability', 'Select availability'); valid = false; }
        if (!experience) { setVolFieldError('vol-experience', 'Select experience level'); valid = false; }
        if (!checkedIssues.length) { document.getElementById('err-vol-issue').textContent = 'Select at least one issue you can handle'; valid = false; }

        return valid;
    }

    function setVolFieldError(fieldId, msg) {
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

    function submitVolunteerForm() {
        const checkedIssues = [...document.querySelectorAll('input[name="vol-issue"]:checked')].map(cb => cb.value);

        const record = {
            name: document.getElementById('vol-name').value.trim(),
            age: parseInt(document.getElementById('vol-age').value, 10),
            gender: document.getElementById('vol-gender').value,
            phone: document.getElementById('vol-phone').value.trim(),
            email: document.getElementById('vol-email').value.trim(),
            area: document.getElementById('vol-area').value.trim(),
            availability: document.getElementById('vol-availability').value,
            experience: document.getElementById('vol-experience').value,
            qualification: document.getElementById('vol-qualification').value.trim(),
            issues: checkedIssues.join(', '),
            bio: document.getElementById('vol-bio').value.trim()
        };

        VOLUNTEER_DATA = addVolunteerRecord(record);

        const toast = document.getElementById('volunteer-toast');
        toast.classList.add('visible');

        document.getElementById('volunteer-form').reset();
        clearVolunteerErrors();

        renderVolunteerCards();

        setTimeout(() => { toast.classList.remove('visible'); }, 4000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderVolunteerSection() {
        VOLUNTEER_DATA = loadVolunteerData();
        renderVolunteerCards();
    }

    function renderVolunteerCards() {
        const container = document.getElementById('volunteer-cards');
        const countEl = document.getElementById('volunteer-count');
        if (!container) return;

        VOLUNTEER_DATA = loadVolunteerData();
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
            const skillTags = String(v.issues).split(',').map(s => {
                const trimmed = s.trim();
                return trimmed ? `<span class="vol-skill-tag">${trimmed}</span>` : '';
            }).join('');

            return `
            <div class="volunteer-card" style="animation-delay: ${i * 0.05}s">
                <div class="volunteer-card-top">
                    <div class="volunteer-avatar">${initials}</div>
                    <div>
                        <div class="volunteer-card-name">${v.name}</div>
                        <div class="volunteer-card-meta">${v.gender}, ${v.age} yrs${v.qualification ? ' • ' + v.qualification : ''}</div>
                    </div>
                </div>
                <div class="volunteer-card-details">
                    <div class="vol-detail-row">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span><strong>Area:</strong> ${v.area}</span>
                    </div>
                    <div class="vol-detail-row">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span><strong>Phone:</strong> ${v.phone}</span>
                    </div>
                    ${v.email ? `<div class="vol-detail-row">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <span><strong>Email:</strong> ${v.email}</span>
                    </div>` : ''}
                    <div class="vol-detail-row" style="gap:8px;">
                        <span class="vol-availability-badge">⏰ ${v.availability}</span>
                        <span class="vol-experience-badge">⭐ ${v.experience}</span>
                    </div>
                </div>
                <div class="vol-skills">
                    ${skillTags}
                </div>
                ${v.bio ? `<div style="margin-top:10px;font-size:0.82rem;color:var(--text-muted);line-height:1.5;font-style:italic;">"${v.bio}"</div>` : ''}
                <div class="volunteer-card-actions">
                    <button class="btn-delete-volunteer" data-vol-id="${v.id}" title="Remove this volunteer">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Remove
                    </button>
                </div>
            </div>`;
        }).join('');

        // Attach delete handlers with double-click confirm
        container.querySelectorAll('.btn-delete-volunteer').forEach(btn => {
            let pendingDelete = false;
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!pendingDelete) {
                    pendingDelete = true;
                    btn.textContent = 'Confirm?';
                    btn.style.background = 'rgba(244, 63, 94, 0.25)';
                    btn.style.borderColor = 'rgba(244, 63, 94, 0.6)';
                    setTimeout(() => {
                        if (pendingDelete) {
                            pendingDelete = false;
                            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Remove';
                            btn.style.background = '';
                            btn.style.borderColor = '';
                        }
                    }, 3000);
                } else {
                    pendingDelete = false;
                    const id = parseInt(btn.dataset.volId, 10);
                    VOLUNTEER_DATA = deleteVolunteerRecord(id);
                    renderVolunteerCards();
                }
            });
        });
    }


    // ============================================================
    function setupSearch() {
        const input = document.getElementById('global-search');
        input.addEventListener('input', () => {
            if (currentSection === 'data-table') applyTableFilters();
        });
    }

    // ============================================================
    // FILTER DROPDOWNS
    // ============================================================
    function refreshFilterDropdowns() {
        const locations = unique(SURVEY_DATA, 'location');
        const issues = unique(SURVEY_DATA, 'issue');
        const educations = unique(SURVEY_DATA, 'education');

        const locationSelects = ['filter-location', 'analytics-location'];
        const issueSelects = ['filter-issue', 'analytics-issue'];

        locationSelects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const prev = sel.value;
            sel.innerHTML = '<option value="">All Locations</option>';
            locations.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc; opt.textContent = loc;
                sel.appendChild(opt);
            });
            sel.value = prev;
        });

        issueSelects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const prev = sel.value;
            sel.innerHTML = '<option value="">All Issues</option>';
            issues.forEach(iss => {
                const opt = document.createElement('option');
                opt.value = iss; opt.textContent = iss;
                sel.appendChild(opt);
            });
            sel.value = prev;
        });

        const eduSel = document.getElementById('filter-education');
        if (eduSel) {
            const prev = eduSel.value;
            eduSel.innerHTML = '<option value="">All Education</option>';
            educations.forEach(edu => {
                const opt = document.createElement('option');
                opt.value = edu; opt.textContent = edu;
                eduSel.appendChild(opt);
            });
            eduSel.value = prev;
        }
    }

    function setupFilterListeners() {
        ['filter-location', 'filter-issue', 'filter-education'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                currentPage = 1;
                applyTableFilters();
            });
        });

        document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
            ['filter-location', 'filter-issue', 'filter-education'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            document.getElementById('global-search').value = '';
            currentPage = 1;
            applyTableFilters();
        });

        ['analytics-location', 'analytics-issue'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => renderAnalytics());
        });
    }

    // ============================================================
    // OVERVIEW
    // ============================================================
    function renderOverview() {
        const data = SURVEY_DATA;

        if (!data.length) {
            document.getElementById('stat-total-val').textContent = '0';
            document.getElementById('stat-villages-val').textContent = '0';
            document.getElementById('stat-issues-val').textContent = '0';
            return;
        }

        animateValue(document.getElementById('stat-total-val'), data.length);
        animateValue(document.getElementById('stat-villages-val'), unique(data, 'location').length);
        animateValue(document.getElementById('stat-issues-val'), unique(data, 'issue').length);

        renderPieChart('overview-pie-chart', data);
        renderTrendLineChart('overview-line-chart', data);
    }

    // ============================================================
    // DATA TABLE
    // ============================================================
    function renderDataTable() { applyTableFilters(); }

    function applyTableFilters() {
        const locFilter = document.getElementById('filter-location').value;
        const issueFilter = document.getElementById('filter-issue').value;
        const eduFilter = document.getElementById('filter-education').value;
        const searchQuery = document.getElementById('global-search').value.toLowerCase().trim();

        filteredData = SURVEY_DATA.filter(d => {
            if (locFilter && d.location !== locFilter) return false;
            if (issueFilter && !String(d.issue).split(',').map(i => i.trim()).includes(issueFilter)) return false;
            if (eduFilter && d.education !== eduFilter) return false;
            if (searchQuery) {
                const hay = `${d.name} ${d.location} ${d.issue} ${d.education} ${d.gender}`.toLowerCase();
                if (!hay.includes(searchQuery)) return false;
            }
            return true;
        });

        sortData();
        renderTableRows();
        renderPagination();
    }

    function setupTableSort() {
        document.querySelectorAll('.data-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (sortColumn === col) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = col;
                    sortDirection = 'asc';
                }
                document.querySelectorAll('.data-table th').forEach(t => t.classList.remove('sort-asc', 'sort-desc'));
                th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
                currentPage = 1;
                applyTableFilters();
            });
        });
    }

    function sortData() {
        filteredData.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];
            if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function renderTableRows() {
        const tbody = document.getElementById('table-body');
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = filteredData.slice(start, end);

        document.getElementById('table-result-count').textContent =
            `Showing ${filteredData.length ? Math.min(start + 1, filteredData.length) : 0}–${Math.min(end, filteredData.length)} of ${filteredData.length} records`;

        if (!pageData.length) {
            tbody.innerHTML = `
                <tr><td colspan="10" style="padding:0;border:none;">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <h3>No records found</h3>
                        <p>Add a new survey entry using the "Add Survey" tab, or adjust your filters.</p>
                    </div>
                </td></tr>`;
            return;
        }

        tbody.innerHTML = pageData.map((d, i) => {
            // Render multiple issues as individual tags
            const issueTags = String(d.issue).split(',').map(iss => {
                const trimmed = iss.trim();
                return `<span class="issue-tag ${trimmed.toLowerCase()}">${trimmed}</span>`;
            }).join(' ');

            return `
            <tr style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
                <td style="color:var(--text-muted);font-weight:600;">${d.id}</td>
                <td style="color:var(--text-primary);font-weight:500;">${d.name}</td>
                <td>${d.age}</td>
                <td>${d.gender}</td>
                <td>
                    <span style="display:inline-flex;align-items:center;gap:6px;">
                        <span style="width:6px;height:6px;border-radius:50%;background:var(--accent-violet);"></span>
                        ${d.location}
                    </span>
                </td>
                <td>${d.education}</td>
                <td>${issueTags}</td>
                <td style="color:var(--text-muted);">${formatDate(d.date)}</td>
                <td>
                    <button class="btn-delete-row" data-id="${d.id}" title="Delete this record">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Delete
                    </button>
                </td>
            </tr>`;
        }).join('');

        // Attach delete handlers
        tbody.querySelectorAll('.btn-delete-row').forEach(function (btn) {
            let pendingDelete = false;

            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (!pendingDelete) {
                    // First click — show confirmation
                    pendingDelete = true;
                    btn.textContent = 'Confirm?';
                    btn.style.background = 'rgba(244, 63, 94, 0.25)';
                    btn.style.borderColor = 'rgba(244, 63, 94, 0.6)';

                    // Auto-cancel after 3s
                    setTimeout(function () {
                        if (pendingDelete) {
                            pendingDelete = false;
                            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete';
                            btn.style.background = '';
                            btn.style.borderColor = '';
                        }
                    }, 3000);
                } else {
                    // Second click — confirmed, delete record
                    pendingDelete = false;
                    const id = parseInt(btn.dataset.id, 10);
                    var data = loadSurveyData();
                    data = data.filter(function (d) { return d.id !== id; });
                    saveSurveyData(data);
                    SURVEY_DATA = data;
                    filteredData = [...SURVEY_DATA];
                    updateSidebarCount();
                    refreshFilterDropdowns();
                    applyTableFilters();
                }
            });
        });
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function renderPagination() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        const container = document.getElementById('pagination');
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
                if (i === 3 || i === totalPages - 2) html += `<span style="color:var(--text-muted);padding:0 4px;">…</span>`;
                continue;
            }
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;

        container.innerHTML = html;
        container.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    currentPage = page;
                    renderTableRows();
                    renderPagination();
                    document.querySelector('.table-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ============================================================
    // ANALYTICS
    // ============================================================
    function renderAnalytics() {
        const locFilter = document.getElementById('analytics-location')?.value || '';
        const issueFilter = document.getElementById('analytics-issue')?.value || '';

        let data = SURVEY_DATA;
        if (locFilter) data = data.filter(d => d.location === locFilter);
        if (issueFilter) data = data.filter(d => String(d.issue).split(',').map(i => i.trim()).includes(issueFilter));

        if (!data.length) {
            ['analytics-pie-chart', 'analytics-line-chart', 'analytics-education-chart', 'analytics-age-chart'].forEach(id => destroyChart(id));
            return;
        }

        renderPieChart('analytics-pie-chart', data, 'doughnut');
        renderTrendLineChart('analytics-line-chart', data);
        renderEducationChart('analytics-education-chart', data);
        renderAgeChart('analytics-age-chart', data);
    }

    // ============================================================
    // CHART RENDERERS
    // ============================================================
    function getChartDefaults() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 12, weight: '500' },
                        padding: 16, usePointStyle: true, pointStyleWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f1f5f9', bodyColor: '#94a3b8',
                    borderColor: 'rgba(99, 102, 241, 0.3)', borderWidth: 1,
                    cornerRadius: 10, padding: 12,
                    titleFont: { family: 'Inter', weight: '600' },
                    bodyFont: { family: 'Inter' },
                    displayColors: true, boxPadding: 4
                }
            }
        };
    }

    function destroyChart(id) {
        if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    }

    function renderPieChart(canvasId, data, type = 'pie') {
        destroyChart(canvasId);
        const counts = countBy(data, 'issue');
        const labels = Object.keys(counts);
        const values = Object.values(counts);
        const ctx = document.getElementById(canvasId).getContext('2d');
        charts[canvasId] = new Chart(ctx, {
            type: type === 'doughnut' ? 'doughnut' : 'pie',
            data: { labels, datasets: [{ data: values, backgroundColor: CHART_COLORS.slice(0, labels.length), borderColor: 'rgba(10, 14, 26, 0.8)', borderWidth: 3, hoverOffset: 8 }] },
            options: { ...getChartDefaults(), cutout: type === 'doughnut' ? '55%' : 0, plugins: { ...getChartDefaults().plugins, legend: { ...getChartDefaults().plugins.legend, position: 'bottom' } }, animation: { animateScale: true, animateRotate: true, duration: 1000, easing: 'easeOutQuart' } }
        });
    }

    function renderTrendLineChart(canvasId, data) {
        destroyChart(canvasId);
        const monthMap = {};
        data.forEach(d => { const m = d.date.substring(0, 7); monthMap[m] = (monthMap[m] || 0) + 1; });
        const sortedMonths = Object.keys(monthMap).sort();
        const labels = sortedMonths.map(m => { const [y, mo] = m.split('-'); return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); });
        const values = sortedMonths.map(m => monthMap[m]);
        const cumulative = []; values.reduce((acc, val, i) => { cumulative[i] = acc + val; return cumulative[i]; }, 0);
        const ctx = document.getElementById(canvasId).getContext('2d');
        const gf1 = ctx.createLinearGradient(0, 0, 0, 350); gf1.addColorStop(0, 'rgba(99, 102, 241, 0.25)'); gf1.addColorStop(1, 'rgba(99, 102, 241, 0.01)');
        const gf2 = ctx.createLinearGradient(0, 0, 0, 350); gf2.addColorStop(0, 'rgba(16, 185, 129, 0.2)'); gf2.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
        charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [
                { label: 'Monthly Responses', data: values, borderColor: '#6366f1', backgroundColor: gf1, borderWidth: 3, fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointBorderColor: '#0a0e1a', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 8 },
                { label: 'Cumulative Total', data: cumulative, borderColor: '#10b981', backgroundColor: gf2, borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#10b981', pointBorderColor: '#0a0e1a', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 7, borderDash: [5, 5] }
            ] },
            options: { ...getChartDefaults(), interaction: { intersect: false, mode: 'index' }, scales: { x: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }, y: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }, beginAtZero: true } }, animation: { duration: 1200, easing: 'easeOutQuart' } }
        });
    }

    function renderEducationChart(canvasId, data) {
        destroyChart(canvasId);
        const counts = countBy(data, 'education');
        const labels = Object.keys(counts); const values = Object.values(counts);
        const ctx = document.getElementById(canvasId).getContext('2d');
        charts[canvasId] = new Chart(ctx, {
            type: 'polarArea',
            data: { labels, datasets: [{ data: values, backgroundColor: CHART_COLORS_ALPHA.slice(0, labels.length), borderColor: CHART_COLORS.slice(0, labels.length), borderWidth: 2 }] },
            options: { ...getChartDefaults(), plugins: { ...getChartDefaults().plugins, legend: { ...getChartDefaults().plugins.legend, position: 'bottom' } }, scales: { r: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b', backdropColor: 'transparent', font: { size: 10 } } } }, animation: { animateScale: true, duration: 1000 } }
        });
    }

    function renderAgeChart(canvasId, data) {
        destroyChart(canvasId);
        const ageGroups = [{ label: '18–25', min: 18, max: 25 }, { label: '26–35', min: 26, max: 35 }, { label: '36–45', min: 36, max: 45 }, { label: '46–55', min: 46, max: 55 }, { label: '56–65', min: 56, max: 65 }, { label: '65+', min: 65, max: 200 }];
        const maleData = ageGroups.map(g => data.filter(d => d.gender === 'Male' && d.age >= g.min && d.age <= g.max).length);
        const femaleData = ageGroups.map(g => data.filter(d => d.gender === 'Female' && d.age >= g.min && d.age <= g.max).length);
        const ctx = document.getElementById(canvasId).getContext('2d');
        charts[canvasId] = new Chart(ctx, {
            type: 'radar',
            data: { labels: ageGroups.map(g => g.label), datasets: [
                { label: 'Male', data: maleData, borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.15)', borderWidth: 2, pointBackgroundColor: '#6366f1', pointRadius: 4 },
                { label: 'Female', data: femaleData, borderColor: '#ec4899', backgroundColor: 'rgba(236, 72, 153, 0.15)', borderWidth: 2, pointBackgroundColor: '#ec4899', pointRadius: 4 }
            ] },
            options: { ...getChartDefaults(), scales: { r: { grid: { color: 'rgba(148,163,184,0.08)' }, angleLines: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b', backdropColor: 'transparent', font: { size: 10 }, stepSize: 2 }, pointLabels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } } }, animation: { duration: 1000 } }
        });
    }

    // ============================================================
    // PATTERNS
    // ============================================================
    function renderPatterns() {
        const container = document.getElementById('patterns-container');

        if (SURVEY_DATA.length < 3) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🧠</div><h3>Not enough data for pattern analysis</h3><p>Add at least 3 survey entries to start detecting patterns and correlations.</p></div>`;
            return;
        }

        const patterns = detectPatterns();
        container.innerHTML = patterns.map(p => `
            <div class="pattern-card">
                <div class="pattern-card-header">
                    <div class="pattern-icon ${p.iconClass}">${p.emoji}</div>
                    <div><div class="pattern-title">${p.title}</div></div>
                    <span class="pattern-strength ${p.strengthClass}">${p.strength}</span>
                </div>
                <div class="pattern-body">${p.description}</div>
                <div class="pattern-evidence">
                    ${p.evidence.map(e => `<div class="evidence-chip"><span class="evidence-label">${e.label}</span><span class="evidence-value">${e.value}</span></div>`).join('')}
                </div>
            </div>
        `).join('');
    }

    function detectPatterns() {
        const patterns = [];
        const data = SURVEY_DATA;
        const locations = unique(data, 'location');

        // Flatten issues helper
        function hasIssue(d, issue) { return String(d.issue).split(',').map(i => i.trim()).includes(issue); }

        // --- Unemployment by location ---
        const unemploymentByLoc = {};
        locations.forEach(loc => {
            const locData = data.filter(d => d.location === loc);
            const unemp = locData.filter(d => hasIssue(d, 'Unemployment')).length;
            unemploymentByLoc[loc] = { count: unemp, total: locData.length, pct: Math.round((unemp / locData.length) * 100) };
        });
        const topUnempLoc = Object.entries(unemploymentByLoc).sort((a, b) => b[1].pct - a[1].pct)[0];
        if (topUnempLoc && topUnempLoc[1].count > 0) {
            patterns.push({
                title: `Most people in ${topUnempLoc[0]} face unemployment`,
                description: `<strong>${topUnempLoc[1].pct}%</strong> of respondents in <strong>${topUnempLoc[0]}</strong> reported unemployment as a concern.`,
                emoji: '💼', iconClass: 'pi-warning', strength: topUnempLoc[1].pct > 30 ? 'High' : 'Medium', strengthClass: topUnempLoc[1].pct > 30 ? 'strength-high' : 'strength-medium',
                evidence: [{ label: 'Affected', value: `${topUnempLoc[1].count} of ${topUnempLoc[1].total}` }, { label: 'Rate', value: `${topUnempLoc[1].pct}%` }]
            });
        }

        // --- Health & age ---
        const healthData = data.filter(d => hasIssue(d, 'Health'));
        if (healthData.length >= 2) {
            const avgHealthAge = avgBy(healthData, 'age');
            const overallAvgAge = avgBy(data, 'age');
            patterns.push({
                title: 'Health issues concentrated among older populations',
                description: `Avg age of health reporters: <strong>${avgHealthAge} yrs</strong> vs overall <strong>${overallAvgAge} yrs</strong>.`,
                emoji: '🏥', iconClass: 'pi-danger', strength: 'High', strengthClass: 'strength-high',
                evidence: [{ label: 'Health Avg Age', value: `${avgHealthAge}` }, { label: 'Overall Avg', value: `${overallAvgAge}` }]
            });
        }

        if (!patterns.length) {
            patterns.push({
                title: 'Collecting more data...',
                description: 'Add more diverse survey entries to enable pattern detection.',
                emoji: '📊', iconClass: 'pi-info', strength: 'Info', strengthClass: 'strength-low',
                evidence: [{ label: 'Records', value: `${data.length}` }, { label: 'Locations', value: `${locations.length}` }]
            });
        }

        return patterns;
    }

    // ============================================================
    // BOOT
    // ============================================================
    document.addEventListener('DOMContentLoaded', init);
})();
