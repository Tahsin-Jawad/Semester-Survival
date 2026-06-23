// ============================================================
// SEMESTER SURVIVAL — app.js (Complete Rewrite + Smart Planner patch)
// All-in-one: Dashboard, Courses, Assignments, Exams,
// Focus Timer, Survival Mode, Daily Planner, Smart Planner
// ============================================================

// ===== STATE =====
var state = {
  courses:       JSON.parse(localStorage.getItem('ss_courses')       || '[]'),
  assignments:   JSON.parse(localStorage.getItem('ss_assignments')   || '[]'),
  exams:         JSON.parse(localStorage.getItem('ss_exams')         || '[]'),
  survivalExams: JSON.parse(localStorage.getItem('ss_survival')      || '[]'),
  plannerTasks:  JSON.parse(localStorage.getItem('ss_planner')       || '[]'),
  sessions:      parseInt(localStorage.getItem('ss_sessions')        || '0'),
};

function save() {
  localStorage.setItem('ss_courses',     JSON.stringify(state.courses));
  localStorage.setItem('ss_assignments', JSON.stringify(state.assignments));
  localStorage.setItem('ss_exams',       JSON.stringify(state.exams));
  localStorage.setItem('ss_survival',    JSON.stringify(state.survivalExams));
  localStorage.setItem('ss_planner',     JSON.stringify(state.plannerTasks));
  localStorage.setItem('ss_sessions',    state.sessions);
}

// ===== THEME =====
function toggleTheme() {
  var html = document.documentElement;
  var isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('ss_theme', isDark ? 'light' : 'dark');
  var lbl = document.querySelector('.theme-label');
  if (lbl) lbl.textContent = isDark ? 'Dark mode' : 'Light mode';
}

(function initTheme() {
  var saved = localStorage.getItem('ss_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('DOMContentLoaded', function() {
    var lbl = document.querySelector('.theme-label');
    if (lbl) lbl.textContent = saved === 'dark' ? 'Light mode' : 'Dark mode';
  });
})();

// ===== MOBILE SIDEBAR =====
function toggleSidebar() {
  var sidebar  = document.getElementById('sidebar');
  var overlay  = document.getElementById('sidebarOverlay');
  var isOpen   = sidebar.classList.contains('open');
  if (isOpen) {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  }
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ===== MOTIVATIONAL QUOTES =====
var quotes = [
  "Discipline today, success tomorrow.",
  "Study hard in silence, success will speak.",
  "Stay consistent, not perfect.",
  "Focus now, freedom later.",
  "One focused hour can change your day.",
  "Small steps every day. Big results every semester.",
  "The grind doesn't stop. Neither should you."
];

var currentQuoteIndex = Math.floor(Math.random() * quotes.length);

function rotateQuote() {
  var el = document.getElementById('quote-text');
  if (!el) return;
  el.classList.add('fade-out');
  setTimeout(function() {
    currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
    el.textContent = quotes[currentQuoteIndex];
    el.classList.remove('fade-out');
    el.classList.add('fade-in');
    setTimeout(function() { el.classList.remove('fade-in'); }, 500);
  }, 500);
}

function initQuotes() {
  var el = document.getElementById('quote-text');
  if (el) el.textContent = quotes[currentQuoteIndex];
  setInterval(rotateQuote, 12000);
}

// ===== NAVIGATION =====
function navigate(page, el) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  if (el) el.classList.add('active');
  closeSidebar();
  renderPage(page);
}

function renderPage(page) {
  if (page === 'dashboard')    renderDashboard();
  if (page === 'courses')      renderCourses();
  if (page === 'assignments')  renderAssignments();
  if (page === 'exams')        renderExams();
  if (page === 'timer')        renderTimer();
  if (page === 'survival')     renderSurvival();
  if (page === 'planner')      renderPlanner();
  if (page === 'smartplanner') renderSmartPlanner(); // ← SMART PLANNER
}

// ===== MODALS =====
function openModal(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  if (id === 'modal-assign')       populateCourseDropdown('a-course-sel', 'a-course-manual');
  if (id === 'modal-exam')         populateCourseDropdown('e-course-sel', 'e-course-manual');
  if (id === 'modal-survival-add') populateCourseDropdown('s-course-sel', 's-course-manual');
  if (id === 'modal-planner-add')  populateCourseDropdown('p-course-sel', 'p-course-manual');
  // Routine modal needs to render its content
  if (id === 'sp-modal-routine')   renderRoutineModal();
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function closeModalOut(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

// ===== GLOBAL COURSE DROPDOWN SYSTEM =====
function populateCourseDropdown(selId, manualId) {
  var sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = '';

  var blank = document.createElement('option');
  blank.value = '';
  blank.textContent = state.courses.length ? '— Select course —' : '— No courses added yet —';
  sel.appendChild(blank);

  state.courses.forEach(function(c) {
    var opt = document.createElement('option');
    opt.value = c.code + ' — ' + c.name;
    opt.textContent = c.code + ' — ' + c.name;
    sel.appendChild(opt);
  });

  var addOpt = document.createElement('option');
  addOpt.value = '__new__';
  addOpt.textContent = '+ Type manually…';
  sel.appendChild(addOpt);

  var manual = document.getElementById(manualId);
  if (manual) manual.style.display = 'none';
}

function handleCourseSelect(selId, manualId) {
  var sel    = document.getElementById(selId);
  var manual = document.getElementById(manualId);
  if (!sel || !manual) return;
  if (sel.value === '__new__') {
    manual.style.display = 'block';
    manual.focus();
  } else {
    manual.style.display = 'none';
  }
}

function getCourseValue(selId, manualId) {
  var sel = document.getElementById(selId);
  if (!sel) return '';
  if (sel.value === '__new__') {
    var manual = document.getElementById(manualId);
    return manual ? manual.value.trim() : '';
  }
  return sel.value;
}

// ===== HELPERS =====
function daysLeft(dateStr) {
  var d   = new Date(dateStr); d.setHours(0, 0, 0, 0);
  var now = new Date();        now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

function fmtDate(dateStr) {
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function checkCollision() {
  var upcoming = state.exams.filter(function(e) {
    var d = daysLeft(e.date);
    return d >= 0 && d <= 5;
  });
  return upcoming.length >= 2 ? upcoming : null;
}

// ===== DASHBOARD =====
function renderDashboard() {
  var pending = state.assignments.filter(function(a) { return a.status !== 'Completed'; }).length;
  var avgProg = state.courses.length
    ? Math.round(state.courses.reduce(function(s, c) { return s + c.progress; }, 0) / state.courses.length)
    : 0;
  var exSoon = state.exams.filter(function(e) { var d = daysLeft(e.date); return d >= 0 && d <= 14; }).length;

  var metricsEl = document.getElementById('dash-metrics');
  if (metricsEl) {
    metricsEl.innerHTML =
      metricCard(state.courses.length, 'Courses') +
      metricCard(avgProg + '%',        'Avg progress') +
      metricCard(pending,              'Pending tasks') +
      metricCard(exSoon,               'Exams soon');
  }

  var deadlines = state.assignments
    .filter(function(a) { return a.status !== 'Completed'; })
    .sort(function(a, b) { return new Date(a.deadline) - new Date(b.deadline); })
    .slice(0, 5);

  var dlEl = document.getElementById('dash-deadlines');
  if (dlEl) {
    if (!deadlines.length) {
      dlEl.innerHTML = '<div class="empty-state">No pending assignments</div>';
    } else {
      dlEl.innerHTML = deadlines.map(function(a) {
        var d    = daysLeft(a.deadline);
        var dstr = d < 0  ? '<span style="color:var(--danger)">Overdue</span>'
                 : d === 0 ? '<span style="color:var(--danger)">Today</span>'
                 : d + 'd';
        return '<div class="list-row"><div><div class="list-main">' + a.title + '</div><div class="list-sub">' + (a.course || '') + '</div></div><div style="font-size:12px;color:var(--text-muted)">' + dstr + '</div></div>';
      }).join('');
    }
  }

  var upEx = state.exams
    .filter(function(e) { return daysLeft(e.date) >= 0; })
    .sort(function(a, b) { return new Date(a.date) - new Date(b.date); })
    .slice(0, 5);

  var exEl = document.getElementById('dash-exam-list');
  if (exEl) {
    if (!upEx.length) {
      exEl.innerHTML = '<div class="empty-state">No upcoming exams</div>';
    } else {
      exEl.innerHTML = upEx.map(function(e) {
        var d   = daysLeft(e.date);
        var cls = d <= 3 ? 'urgent' : d <= 7 ? 'soon' : 'ok';
        return '<div class="list-row"><div><div class="list-main">' + e.name + '</div><div class="list-sub">' + (e.course || '') + ' · ' + fmtDate(e.date) + '</div></div><div><div class="countdown-num ' + cls + '" style="font-size:1.4rem">' + d + '</div><div class="countdown-label">days</div></div></div>';
      }).join('');
    }
  }

  var collision = checkCollision();
  var banner    = document.getElementById('collision-banner');
  var badgeEl   = document.getElementById('collision-badge');
  if (banner) {
    if (collision) {
      banner.innerHTML = '<div class="collision-banner">⚠ Exam collision — ' + collision.map(function(e) { return e.name; }).join(' & ') + ' within 5 days. Check Survival Mode.</div>';
      if (badgeEl) badgeEl.style.display = 'flex';
    } else {
      banner.innerHTML = '';
      if (badgeEl) badgeEl.style.display = 'none';
    }
  }
}

function metricCard(value, label) {
  return '<div class="metric-card"><div class="metric-label">' + label + '</div><div class="metric-value">' + value + '</div></div>';
}

// ===== COURSES =====
function addCourse() {
  var code = document.getElementById('c-code').value.trim();
  var name = document.getElementById('c-name').value.trim();
  var prog = Math.min(100, Math.max(0, parseInt(document.getElementById('c-prog').value) || 0));
  if (!code || !name) return;
  state.courses.push({ id: Date.now(), code: code, name: name, progress: prog });
  save();
  closeModal('modal-course');
  document.getElementById('c-code').value = '';
  document.getElementById('c-name').value = '';
  document.getElementById('c-prog').value = '';
  renderCourses();
}

function deleteCourse(id) {
  state.courses = state.courses.filter(function(c) { return c.id !== id; });
  save();
  renderCourses();
}

function updateProgress(id, val) {
  var c = state.courses.find(function(c) { return c.id === id; });
  if (c) { c.progress = Math.min(100, Math.max(0, parseInt(val) || 0)); save(); }
}

function renderCourses() {
  var el = document.getElementById('courses-list');
  if (!el) return;
  if (!state.courses.length) {
    el.innerHTML = '<div class="empty-state">No courses yet. Add your first one!</div>';
    return;
  }
  el.innerHTML = state.courses.map(function(c) {
    return '<div class="course-card">' +
      '<div class="course-top">' +
        '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">' +
          '<span class="course-code">' + c.code + '</span>' +
          '<span class="course-name">' + c.name + '</span>' +
        '</div>' +
        '<button class="btn-icon" onclick="deleteCourse(' + c.id + ')">✕</button>' +
      '</div>' +
      '<div class="progress-row">' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + c.progress + '%"></div></div>' +
        '<input type="number" style="width:52px;text-align:center" class="input" value="' + c.progress + '" min="0" max="100" onchange="updateProgress(' + c.id + ',this.value);renderCourses()">' +
        '<span class="progress-pct" style="font-size:11px;color:var(--text-dim)">%</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== ASSIGNMENTS =====
function addAssignment() {
  var title    = document.getElementById('a-title').value.trim();
  var course   = getCourseValue('a-course-sel', 'a-course-manual');
  var deadline = document.getElementById('a-deadline').value;
  var status   = document.getElementById('a-status').value;
  if (!title || !deadline) return;
  state.assignments.push({ id: Date.now(), title: title, course: course, deadline: deadline, status: status });
  save();
  closeModal('modal-assign');
  document.getElementById('a-title').value = '';
  document.getElementById('a-deadline').value = '';
  renderAssignments();
}

function deleteAssignment(id) {
  state.assignments = state.assignments.filter(function(a) { return a.id !== id; });
  save();
  renderAssignments();
}

function updateAssignStatus(id, val) {
  var a = state.assignments.find(function(a) { return a.id === id; });
  if (a) { a.status = val; save(); }
}

function renderAssignments() {
  var el = document.getElementById('assignments-list');
  if (!el) return;
  if (!state.assignments.length) {
    el.innerHTML = '<div class="empty-state">No assignments yet.</div>';
    return;
  }
  var sorted = state.assignments.slice().sort(function(a, b) { return new Date(a.deadline) - new Date(b.deadline); });
  el.innerHTML = sorted.map(function(a) {
    var d       = daysLeft(a.deadline);
    var overdue = d < 0 && a.status !== 'Completed';
    var dstr    = d < 0  ? '<span style="color:var(--danger);font-size:11px">Overdue</span>'
                : d === 0 ? '<span style="color:var(--danger);font-size:11px">Due today</span>'
                : '<span style="font-size:11px;color:var(--text-dim)">' + d + ' days · ' + fmtDate(a.deadline) + '</span>';
    return '<div class="assign-card' + (overdue ? ' overdue' : '') + '">' +
      '<div style="flex:1;min-width:0">' +
        '<div class="list-main" style="margin-bottom:3px">' + a.title + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          (a.course ? '<span style="font-size:11px;color:var(--text-dim)">' + a.course + '</span>' : '') +
          dstr +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' +
        '<select class="input" style="width:auto;font-size:12px;padding:4px 8px" onchange="updateAssignStatus(' + a.id + ',this.value)">' +
          '<option' + (a.status === 'Pending'      ? ' selected' : '') + '>Pending</option>' +
          '<option' + (a.status === 'In Progress'  ? ' selected' : '') + '>In Progress</option>' +
          '<option' + (a.status === 'Completed'    ? ' selected' : '') + '>Completed</option>' +
        '</select>' +
        '<button class="btn-icon" onclick="deleteAssignment(' + a.id + ')">✕</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== EXAMS =====
function addExam() {
  var name   = document.getElementById('e-name').value.trim();
  var course = getCourseValue('e-course-sel', 'e-course-manual');
  var date   = document.getElementById('e-date').value;
  var type   = document.getElementById('e-type').value;
  if (!name || !date) return;
  state.exams.push({ id: Date.now(), name: name, course: course, date: date, type: type });
  save();
  closeModal('modal-exam');
  document.getElementById('e-name').value = '';
  document.getElementById('e-date').value = '';
  renderExams();
}

function deleteExam(id) {
  state.exams = state.exams.filter(function(e) { return e.id !== id; });
  save();
  renderExams();
}

function renderExams() {
  var el = document.getElementById('exams-list');
  if (!el) return;
  if (!state.exams.length) {
    el.innerHTML = '<div class="empty-state">No exams added yet.</div>';
    return;
  }
  var sorted = state.exams.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  el.innerHTML = sorted.map(function(e) {
    var d = daysLeft(e.date);
    if (d < 0) return '';
    var cls    = d <= 3 ? 'urgent' : d <= 7 ? 'soon' : 'ok';
    var typeCls = 'badge-' + e.type.toLowerCase();
    var dlabel  = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : 'days left';
    return '<div class="exam-card">' +
      '<div style="flex:1">' +
        '<div class="list-main" style="margin-bottom:5px">' + e.name + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<span class="badge ' + typeCls + '">' + e.type + '</span>' +
          '<span style="font-size:12px;color:var(--text-dim)">' + (e.course || '') + ' · ' + fmtDate(e.date) + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:right;display:flex;align-items:center;gap:10px">' +
        '<div><div class="countdown-num ' + cls + '">' + d + '</div><div class="countdown-label">' + dlabel + '</div></div>' +
        '<button class="btn-icon" onclick="deleteExam(' + e.id + ')">✕</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== FOCUS TIMER =====
// PATCH: added 'custom' to durations for Smart Planner integration
var timerState = {
  mode:      'focus',
  durations: { focus: 25 * 60, short: 5 * 60, long: 15 * 60, custom: 25 * 60 },
  remaining: 25 * 60,
  running:   false,
  interval:  null,
  _spTask:   null, // set by smart planner when launching focus
};

function renderTimer() {
  var root = document.getElementById('timer-root');
  if (!root) return;

  // Show task label if launched from Smart Planner
  var taskLabel = timerState._spTask
    ? '<div style="font-size:11px;color:var(--accent);font-family:var(--font-mono);margin-bottom:0.75rem;letter-spacing:0.3px">📌 ' + timerState._spTask + '</div>'
    : '';

  root.innerHTML =
    '<div class="timer-wrapper">' +
      '<div class="timer-modes">' +
        '<button class="timer-mode-btn' + (timerState.mode === 'focus' ? ' active' : '') + '" onclick="setTimerMode(\'focus\')">Focus 25m</button>' +
        '<button class="timer-mode-btn' + (timerState.mode === 'short' ? ' active' : '') + '" onclick="setTimerMode(\'short\')">Short Break 5m</button>' +
        '<button class="timer-mode-btn' + (timerState.mode === 'long'  ? ' active' : '') + '" onclick="setTimerMode(\'long\')">Long Break 15m</button>' +
        (timerState.mode === 'custom' ? '<button class="timer-mode-btn active" style="max-width:160px;overflow:hidden;text-overflow:ellipsis">Custom</button>' : '') +
      '</div>' +
      '<div class="timer-face">' +
        taskLabel +
        '<div class="timer-display" id="timer-display">' + formatTime(timerState.remaining) + '</div>' +
        '<div class="timer-msg" id="timer-msg">' + (timerState._spTask ? 'Smart Planner session ready.' : 'Ready to focus?') + '</div>' +
        '<div class="timer-controls">' +
          '<button class="btn-primary" id="timer-start-btn" onclick="timerStartPause()">' + (timerState.running ? 'Pause' : 'Start') + '</button>' +
          '<button class="btn-ghost" onclick="timerReset()">Reset</button>' +
        '</div>' +
      '</div>' +
      '<div class="timer-sessions">' +
        '<span style="font-size:13px;color:var(--text-muted)">Sessions completed today</span>' +
        '<span style="font-family:var(--font-mono);font-size:1.4rem;color:var(--text)" id="sessions-count">' + state.sessions + '</span>' +
      '</div>' +
    '</div>';
}

function setTimerMode(mode) {
  if (timerState.running) timerStop();
  timerState.mode      = mode;
  timerState.remaining = timerState.durations[mode];
  timerState._spTask   = null; // clear smart planner task on manual mode switch
  renderTimer();
}

function formatTime(seconds) {
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function updateTimerUI() {
  var disp = document.getElementById('timer-display');
  var btn  = document.getElementById('timer-start-btn');
  if (disp) disp.textContent = formatTime(timerState.remaining);
  if (btn)  btn.textContent  = timerState.running ? 'Pause' : 'Start';
}

function timerStartPause() {
  if (timerState.running) {
    timerStop();
    var msg = document.getElementById('timer-msg');
    if (msg) msg.textContent = 'Paused — click Start to resume.';
  } else {
    timerStart();
  }
}

function timerStart() {
  if (timerState.remaining <= 0) timerState.remaining = timerState.durations[timerState.mode];
  timerState.running = true;

  var msg = document.getElementById('timer-msg');
  if (msg) {
    msg.className = 'timer-msg';
    msg.textContent = timerState._spTask
      ? 'Focusing on: ' + timerState._spTask
      : (timerState.mode === 'focus' ? 'Stay focused. You\'ve got this.' : 'Take a breather!');
  }
  updateTimerUI();

  timerState.interval = setInterval(function() {
    if (timerState.remaining > 0) {
      timerState.remaining--;
      updateTimerUI();
    } else {
      timerStop();
      if (timerState.mode === 'focus' || timerState.mode === 'custom') {
        state.sessions++;
        save();
        var sc = document.getElementById('sessions-count');
        if (sc) sc.textContent = state.sessions;
      }
      var msgEl = document.getElementById('timer-msg');
      if (msgEl) {
        msgEl.className = 'timer-msg success';
        msgEl.textContent = (timerState.mode === 'focus' || timerState.mode === 'custom')
          ? '🎉 Session complete! Take a break.'
          : '✓ Break over. Ready to focus again?';
      }
    }
  }, 1000);
}

function timerStop() {
  timerState.running = false;
  clearInterval(timerState.interval);
  timerState.interval = null;
  updateTimerUI();
}

function timerReset() {
  timerStop();
  timerState.remaining = timerState.durations[timerState.mode];
  updateTimerUI();
  var msg = document.getElementById('timer-msg');
  if (msg) { msg.className = 'timer-msg'; msg.textContent = 'Ready to focus?'; }
}

// ===== SURVIVAL MODE =====
function addSurvivalExam() {
  var name   = document.getElementById('s-name').value.trim();
  var course = getCourseValue('s-course-sel', 's-course-manual');
  var date   = document.getElementById('s-date').value;
  var topics = document.getElementById('s-topics').value.trim();
  var diff   = document.getElementById('s-diff').value;
  if (!name || !date) return;

  var topicList = topics ? topics.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];

  state.survivalExams.push({
    id:      Date.now(),
    name:    name,
    course:  course,
    date:    date,
    diff:    diff,
    topics:  topicList.map(function(t) { return { label: t, done: false }; }),
  });
  save();
  closeModal('modal-survival-add');

  document.getElementById('s-name').value   = '';
  document.getElementById('s-date').value   = '';
  document.getElementById('s-topics').value = '';

  renderSurvival();
}

function deleteSurvivalExam(id) {
  state.survivalExams = state.survivalExams.filter(function(e) { return e.id !== id; });
  save();
  renderSurvival();
}

function toggleSurvivalTopic(examId, topicIdx) {
  var exam = state.survivalExams.find(function(e) { return e.id === examId; });
  if (!exam || !exam.topics[topicIdx]) return;
  exam.topics[topicIdx].done = !exam.topics[topicIdx].done;
  save();
  renderSurvival();
}

function renderSurvival() {
  var root = document.getElementById('survival-root');
  if (!root) return;

  if (!state.survivalExams.length) {
    root.innerHTML = '<div class="empty-state">No survival exams added. Add one to get a study plan!</div>';
    return;
  }

  var sorted = state.survivalExams.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });

  var totalTopics   = sorted.reduce(function(s, e) { return s + e.topics.length; }, 0);
  var doneTopics    = sorted.reduce(function(s, e) { return s + e.topics.filter(function(t) { return t.done; }).length; }, 0);
  var examsIn5Days  = sorted.filter(function(e) { var d = daysLeft(e.date); return d >= 0 && d <= 5; }).length;
  var stressLevel   = examsIn5Days >= 2 ? 'HIGH' : examsIn5Days === 1 ? 'MEDIUM' : 'LOW';
  var stressCls     = stressLevel === 'HIGH' ? 'stress-high' : stressLevel === 'MEDIUM' ? 'stress-med' : 'stress-low';

  var html = '<div class="survival-header">' +
    '<div>' +
      '<div style="font-size:11px;color:var(--text-dim);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Stress level</div>' +
      '<div class="' + stressCls + '" style="font-size:1.1rem">' + stressLevel + '</div>' +
    '</div>' +
    '<div style="text-align:right">' +
      '<div style="font-size:11px;color:var(--text-dim);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Topics covered</div>' +
      '<div style="font-size:1.1rem;font-weight:600;color:var(--text)">' + doneTopics + ' / ' + totalTopics + '</div>' +
    '</div>' +
  '</div>';

  html += sorted.map(function(e) {
    var d         = daysLeft(e.date);
    if (d < 0) return '';
    var cls       = d <= 3 ? 'urgent' : d <= 7 ? 'soon' : 'ok';
    var diffCls   = 'diff-' + e.diff.toLowerCase();
    var doneCnt   = e.topics.filter(function(t) { return t.done; }).length;
    var pct       = e.topics.length ? Math.round(doneCnt / e.topics.length * 100) : 0;

    var topicsHtml = e.topics.length
      ? e.topics.map(function(t, idx) {
          return '<div class="topic-row" onclick="toggleSurvivalTopic(' + e.id + ',' + idx + ')">' +
            '<div class="topic-check' + (t.done ? ' done' : '') + '"></div>' +
            '<span class="topic-label' + (t.done ? ' done' : '') + '">' + t.label + '</span>' +
            '<div class="diff-dot ' + diffCls + '"></div>' +
          '</div>';
        }).join('')
      : '<div style="font-size:12px;color:var(--text-dim);padding:8px 0">No topics added.</div>';

    return '<div class="survival-card">' +
      '<div class="survival-card-header">' +
        '<div>' +
          '<div class="list-main" style="margin-bottom:4px">' + e.name + '</div>' +
          '<div style="font-size:12px;color:var(--text-dim)">' + (e.course || '') + ' · ' + fmtDate(e.date) + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div style="text-align:right">' +
            '<div class="countdown-num ' + cls + '" style="font-size:1.4rem">' + d + '</div>' +
            '<div class="countdown-label">days</div>' +
          '</div>' +
          '<button class="btn-icon" onclick="deleteSurvivalExam(' + e.id + ')">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="progress-row" style="margin-bottom:1rem">' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<span style="font-size:11px;color:var(--text-dim);font-family:var(--font-mono)">' + pct + '%</span>' +
      '</div>' +
      topicsHtml +
    '</div>';
  }).join('');

  root.innerHTML = html;
}

// ===== DAILY PLANNER =====
function renderPlanner() {
  var root      = document.getElementById('planner-root');
  var dateLabel = document.getElementById('planner-date-label');
  if (!root) return;

  var today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  if (dateLabel) dateLabel.textContent = today;

  var todayKey  = new Date().toISOString().slice(0, 10);
  var todayTasks = state.plannerTasks.filter(function(t) { return t.date === todayKey; });
  var pastTasks  = state.plannerTasks.filter(function(t) { return t.date !== todayKey; });

  if (!state.plannerTasks.length) {
    root.innerHTML = '<div class="empty-state">No tasks for today. Add your first study task!</div>';
    return;
  }

  var done  = todayTasks.filter(function(t) { return t.done; }).length;
  var total = todayTasks.length;
  var pct   = total ? Math.round(done / total * 100) : 0;

  var html = '';

  if (todayTasks.length) {
    html += '<div class="card" style="margin-bottom:1rem">' +
      '<div class="card-header">' +
        '<span class="card-title">Today — ' + today + '</span>' +
        '<span style="font-size:12px;color:var(--text-muted)">' + done + '/' + total + ' done</span>' +
      '</div>' +
      '<div class="progress-row" style="margin-bottom:1rem">' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<span style="font-size:11px;color:var(--text-dim);font-family:var(--font-mono)">' + pct + '%</span>' +
      '</div>';

    var sortedToday = todayTasks.slice().sort(function(a, b) {
      var pri = { High: 0, Medium: 1, Low: 2 };
      return (pri[a.priority] || 1) - (pri[b.priority] || 1);
    });

    html += sortedToday.map(function(t) {
      var priCls = t.priority === 'High' ? 'priority-high' : t.priority === 'Low' ? 'priority-low' : 'priority-med';
      return '<div class="topic-row" onclick="togglePlannerTask(' + t.id + ')" style="padding:10px 0">' +
        '<div class="topic-check' + (t.done ? ' done' : '') + '"></div>' +
        '<div style="flex:1;min-width:0">' +
          '<span class="topic-label' + (t.done ? ' done' : '') + '">' + t.task + '</span>' +
          (t.course ? '<div style="font-size:11px;color:var(--text-dim);margin-top:2px">' + t.course + '</div>' : '') +
        '</div>' +
        '<span class="' + priCls + '">' + t.priority + '</span>' +
        '<button class="btn-icon" style="margin-left:6px" onclick="event.stopPropagation();deletePlannerTask(' + t.id + ')">✕</button>' +
      '</div>';
    }).join('');

    html += '</div>';
  }

  if (pastTasks.length) {
    var byDate = {};
    pastTasks.forEach(function(t) {
      if (!byDate[t.date]) byDate[t.date] = [];
      byDate[t.date].push(t);
    });
    var dates = Object.keys(byDate).sort().reverse();

    html += '<div class="card">' +
      '<div class="card-header"><span class="card-title">Previous days</span></div>';

    dates.forEach(function(dateKey) {
      var tasks    = byDate[dateKey];
      var doneCnt  = tasks.filter(function(t) { return t.done; }).length;
      var d        = new Date(dateKey);
      var label    = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
      html += '<div class="list-row">' +
        '<div class="list-main">' + label + '</div>' +
        '<div style="font-size:12px;color:var(--text-dim)">' + doneCnt + '/' + tasks.length + ' completed</div>' +
      '</div>';
    });

    html += '</div>';
  }

  root.innerHTML = html;
}

function addPlannerTask() {
  var task   = document.getElementById('p-task').value.trim();
  var course = getCourseValue('p-course-sel', 'p-course-manual');
  var pri    = document.getElementById('p-priority').value;
  if (!task) return;
  var todayKey = new Date().toISOString().slice(0, 10);
  state.plannerTasks.push({ id: Date.now(), task: task, course: course, priority: pri, done: false, date: todayKey });
  save();
  closeModal('modal-planner-add');
  document.getElementById('p-task').value = '';
  renderPlanner();
}

function togglePlannerTask(id) {
  var t = state.plannerTasks.find(function(t) { return t.id === id; });
  if (t) { t.done = !t.done; save(); renderPlanner(); }
}

function deletePlannerTask(id) {
  state.plannerTasks = state.plannerTasks.filter(function(t) { return t.id !== id; });
  save();
  renderPlanner();
}

// ===== GLOBAL FUNCTION EXPORTS =====
window.navigate           = navigate;
window.openModal          = openModal;
window.closeModal         = closeModal;
window.closeModalOut      = closeModalOut;
window.toggleTheme        = toggleTheme;
window.toggleSidebar      = toggleSidebar;
window.closeSidebar       = closeSidebar;
window.handleCourseSelect = handleCourseSelect;

window.addCourse          = addCourse;
window.deleteCourse       = deleteCourse;
window.updateProgress     = updateProgress;
window.renderCourses      = renderCourses;

window.addAssignment      = addAssignment;
window.deleteAssignment   = deleteAssignment;
window.updateAssignStatus = updateAssignStatus;

window.addExam            = addExam;
window.deleteExam         = deleteExam;

window.setTimerMode       = setTimerMode;
window.timerStartPause    = timerStartPause;
window.timerReset         = timerReset;

window.addSurvivalExam       = addSurvivalExam;
window.deleteSurvivalExam    = deleteSurvivalExam;
window.toggleSurvivalTopic   = toggleSurvivalTopic;

window.addPlannerTask      = addPlannerTask;
window.togglePlannerTask   = togglePlannerTask;
window.deletePlannerTask   = deletePlannerTask;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  initQuotes();
  renderDashboard();
});
