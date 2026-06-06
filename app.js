// ===== STATE =====
var state = {
  courses:      JSON.parse(localStorage.getItem('ss_courses')      || '[]'),
  assignments:  JSON.parse(localStorage.getItem('ss_assignments')  || '[]'),
  exams:        JSON.parse(localStorage.getItem('ss_exams')        || '[]'),
  survivalExams:JSON.parse(localStorage.getItem('ss_survival')     || '[]'),
  sessions:     parseInt(localStorage.getItem('ss_sessions')       || '0'),
};

function save() {
  localStorage.setItem('ss_courses',       JSON.stringify(state.courses));
  localStorage.setItem('ss_assignments',   JSON.stringify(state.assignments));
  localStorage.setItem('ss_exams',         JSON.stringify(state.exams));
  localStorage.setItem('ss_survival',      JSON.stringify(state.survivalExams));
  localStorage.setItem('ss_sessions',      state.sessions);
}

// ===== THEME =====
function toggleTheme() {
  var html = document.documentElement;
  var isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('ss_theme', isDark ? 'light' : 'dark');
  document.querySelector('.theme-label').textContent = isDark ? 'Dark mode' : 'Light mode';
}

(function initTheme() {
  var saved = localStorage.getItem('ss_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('DOMContentLoaded', function() {
    var lbl = document.querySelector('.theme-label');
    if (lbl) lbl.textContent = saved === 'dark' ? 'Light mode' : 'Dark mode';
  });
})();

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
  renderPage(page);
}

function renderPage(page) {
  if (page === 'dashboard')   renderDashboard();
  if (page === 'courses')     renderCourses();
  if (page === 'assignments') renderAssignments();
  if (page === 'exams')       renderExams();
  if (page === 'timer')       renderTimer();
  if (page === 'survival')    renderSurvival();
}

// ===== MODALS =====
function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function closeModalOut(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

// ===== HELPERS =====
function daysLeft(dateStr) {
  var d = new Date(dateStr); d.setHours(0,0,0,0);
  var now = new Date(); now.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
}

function fmtDate(dateStr) {
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
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
    ? Math.round(state.courses.reduce(function(s,c) { return s + c.progress; }, 0) / state.courses.length)
    : 0;
  var exSoon = state.exams.filter(function(e) { var d=daysLeft(e.date); return d>=0&&d<=14; }).length;

  document.getElementById('dash-metrics').innerHTML =
    metricCard(state.courses.length, 'Courses', '') +
    metricCard(avgProg + '%', 'Avg progress', '') +
    metricCard(pending, 'Pending tasks', '') +
    metricCard(exSoon, 'Exams soon', '');

  // Deadlines
  var deadlines = state.assignments
    .filter(function(a) { return a.status !== 'Completed'; })
    .sort(function(a,b) { return new Date(a.deadline) - new Date(b.deadline); })
    .slice(0, 5);

  var dlEl = document.getElementById('dash-deadlines');
  if (!deadlines.length) {
    dlEl.innerHTML = '<div class="empty-state">No pending assignments</div>';
  } else {
    dlEl.innerHTML = deadlines.map(function(a) {
      var d = daysLeft(a.deadline);
      var dstr = d < 0 ? '<span style="color:var(--danger)">Overdue</span>'
                : d === 0 ? '<span style="color:var(--danger)">Today</span>'
                : d + 'd';
      return '<div class="list-row"><div><div class="list-main">' + a.title + '</div><div class="list-sub">' + a.course + '</div></div><div style="font-size:12px;color:var(--text-muted)">' + dstr + '</div></div>';
    }).join('');
  }

  // Exams
  var upEx = state.exams
    .filter(function(e) { return daysLeft(e.date) >= 0; })
    .sort(function(a,b) { return new Date(a.date) - new Date(b.date); })
    .slice(0, 5);

  var exEl = document.getElementById('dash-exam-list');
  if (!upEx.length) {
    exEl.innerHTML = '<div class="empty-state">No upcoming exams</div>';
  } else {
    exEl.innerHTML = upEx.map(function(e) {
      var d = daysLeft(e.date);
      var cls = d <= 3 ? 'urgent' : d <= 7 ? 'soon' : 'ok';
      return '<div class="list-row"><div><div class="list-main">' + e.name + '</div><div class="list-sub">' + e.course + ' · ' + fmtDate(e.date) + '</div></div><div><div class="countdown-num ' + cls + '" style="font-size:1.4rem">' + d + '</div><div class="countdown-label">days</div></div></div>';
    }).join('');
  }

  // Collision banner
  var collision = checkCollision();
  var banner = document.getElementById('collision-banner');
  var badgeEl = document.getElementById('collision-badge');
  if (collision) {
    banner.innerHTML = '<div class="collision-banner">⚠ Exam collision — ' + collision.map(function(e){return e.name;}).join(' & ') + ' within 5 days. Check Survival Mode.</div>';
    if (badgeEl) badgeEl.style.display = 'flex';
  } else {
    banner.innerHTML = '';
    if (badgeEl) badgeEl.style.display = 'none';
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
  save(); closeModal('modal-course');
  document.getElementById('c-code').value = '';
  document.getElementById('c-name').value = '';
  document.getElementById('c-prog').value = '';
  renderCourses();
}

function deleteCourse(id) {
  state.courses = state.courses.filter(function(c) { return c.id !== id; });
  save(); renderCourses();
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
        '<div style="display:flex;align-items:center">' +
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
  var course   = document.getElementById('a-course').value.trim();
  var deadline = document.getElementById('a-deadline').value;
  var status   = document.getElementById('a-status').value;
  if (!title || !deadline) return;
  state.assignments.push({ id: Date.now(), title: title, course: course, deadline: deadline, status: status });
  save(); closeModal('modal-assign');
  document.getElementById('a-title').value = '';
  document.getElementById('a-course').value = '';
  document.getElementById('a-deadline').value = '';
  renderAssignments();
}

function deleteAssignment(id) {
  state.assignments = state.assignments.filter(function(a) { return a.id !== id; });
  save(); renderAssignments();
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
  var sorted = state.assignments.slice().sort(function(a,b) { return new Date(a.deadline) - new Date(b.deadline); });
  el.innerHTML = sorted.map(function(a) {
    var d = daysLeft(a.deadline);
    var overdue = d < 0 && a.status !== 'Completed';
    var dstr = d < 0 ? '<span style="color:var(--danger);font-size:11px">Overdue</span>'
              : d === 0 ? '<span style="color:var(--danger);font-size:11px">Due today</span>'
              : '<span style="font-size:11px;color:var(--text-dim)">' + d + ' days · ' + fmtDate(a.deadline) + '</span>';
    var statusCls = a.status === 'Completed' ? 'badge-done' : a.status === 'In Progress' ? 'badge-progress' : 'badge-pending';
    return '<div class="assign-card' + (overdue?' overdue':'') + '">' +
      '<div style="flex:1;min-width:0">' +
        '<div class="list-main" style="margin-bottom:3px">' + a.title + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          (a.course ? '<span style="font-size:11px;color:var(--text-dim)">' + a.course + '</span>' : '') +
          dstr +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' +
        '<select class="input" style="width:auto;font-size:12px;padding:4px 8px" onchange="updateAssignStatus(' + a.id + ',this.value)">' +
          '<option' + (a.status==='Pending'?' selected':'') + '>Pending</option>' +
          '<option' + (a.status==='In Progress'?' selected':'') + '>In Progress</option>' +
          '<option' + (a.status==='Completed'?' selected':'') + '>Completed</option>' +
        '</select>' +
        '<button class="btn-icon" onclick="deleteAssignment(' + a.id + ')">✕</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== EXAMS =====
function addExam() {
  var name   = document.getElementById('e-name').value.trim();
  var course = document.getElementById('e-course').value.trim();
  var date   = document.getElementById('e-date').value;
  var type   = document.getElementById('e-type').value;
  if (!name || !date) return;
  state.exams.push({ id: Date.now(), name: name, course: course, date: date, type: type });
  save(); closeModal('modal-exam');
  document.getElementById('e-name').value = '';
  document.getElementById('e-course').value = '';
  document.getElementById('e-date').value = '';
  renderExams();
}

function deleteExam(id) {
  state.exams = state.exams.filter(function(e) { return e.id !== id; });
  save(); renderExams();
}

function renderExams() {
  var el = document.getElementById('exams-list');
  if (!el) return;
  if (!state.exams.length) {
    el.innerHTML = '<div class="empty-state">No exams added yet.</div>';
    return;
  }
  var sorted = state.exams.slice().sort(function(a,b) { return new Date(a.date) - new Date(b.date); });
  el.innerHTML = sorted.map(function(e) {
    var d = daysLeft(e.date);
    if (d < 0) return '';
    var cls = d <= 3 ? 'urgent' : d <= 7 ? 'soon' : 'ok';
    var typeCls = 'badge-' + e.type.toLowerCase();
    var dlabel = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : 'days left';
    return '<div class="exam-card">' +
      '<div style="flex:1">' +
        '<div class="list-main" style="margin-bottom:5px">' + e.name + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span class="badge ' + typeCls + '">' + e.type + '</span>' +
          '<span style="font-size:12px;color:var(--text-dim)">' + e.course + ' · ' + fmtDate(e.date) + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:right;display:flex;align-items:center;gap:10px">' +
        '<div><div class="countdown-num ' + cls + '">' + d + '</div><div class="countdown-label">' + dlabel + '</div></div>' +
        '<button class="btn-icon" onclick="deleteExam(' + e.id + ')">✕</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  initQuotes();
  renderDashboard();
});
