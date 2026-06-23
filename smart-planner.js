// ============================================================
// SMART STUDY SCHEDULER — smart-planner.js
// Integrates with Semester Survival app.js
// ============================================================

// ===== SMART PLANNER STATE =====
var sp = {
  tasks:      JSON.parse(localStorage.getItem('sp_tasks')   || '[]'),
  schedule:   JSON.parse(localStorage.getItem('sp_schedule') || '[]'),
  routine:    JSON.parse(localStorage.getItem('sp_routine')  || 'null') || defaultRoutine(),
  reminders:  [], // runtime only (setTimeout handles)
  notifAsked: localStorage.getItem('sp_notif_asked') === 'true',
  view:       'timeline', // 'timeline' | 'card'
};

function defaultRoutine() {
  return {
    sleepHours: 6,
    wakeTime:   '07:00',
    sleepTime:  '01:00', // 1am next day
    days: {
      Monday:    [{ start: '10:00', end: '11:30' }, { start: '14:00', end: '15:30' }],
      Tuesday:   [{ start: '09:00', end: '10:30' }, { start: '13:00', end: '14:30' }],
      Wednesday: [{ start: '10:00', end: '11:30' }, { start: '14:00', end: '15:30' }],
      Thursday:  [{ start: '09:00', end: '10:30' }, { start: '13:00', end: '14:30' }],
      Friday:    [{ start: '10:00', end: '11:30' }],
      Saturday:  [],
      Sunday:    [],
    }
  };
}

function spSave() {
  localStorage.setItem('sp_tasks',    JSON.stringify(sp.tasks));
  localStorage.setItem('sp_schedule', JSON.stringify(sp.schedule));
  localStorage.setItem('sp_routine',  JSON.stringify(sp.routine));
}

// ===== MINUTE MATH HELPERS =====
function timeToMin(t) {
  // "HH:MM" -> minutes since midnight
  var parts = t.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function minToTime(m) {
  // minutes since midnight -> "HH:MM"
  m = ((m % 1440) + 1440) % 1440; // wrap around midnight
  var h = Math.floor(m / 60);
  var min = m % 60;
  var ampm = h < 12 ? 'AM' : 'PM';
  var h12 = h % 12 || 12;
  return (h12 < 10 ? '0' : '') + h12 + ':' + (min < 10 ? '0' : '') + min + ' ' + ampm;
}

function minToTime24(m) {
  m = ((m % 1440) + 1440) % 1440;
  var h = Math.floor(m / 60);
  var min = m % 60;
  return (h < 10 ? '0' : '') + h + ':' + (min < 10 ? '0' : '') + min;
}

function getDayName() {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
}

// ===== WORKLOAD SCORE =====
function calcWorkloadScore(tasks) {
  var diffMap = { Easy: 1, Medium: 2, Hard: 3 };
  var priMap  = { Low: 1, Medium: 1.5, High: 2 };
  var score = tasks.reduce(function(s, t) {
    return s + (t.durationMin / 60) * (diffMap[t.difficulty] || 1) * (priMap[t.priority] || 1);
  }, 0);
  return score;
}

function workloadLabel(score) {
  if (score < 4)  return { label: 'Light Day',    cls: 'wl-light',  icon: '🟢' };
  if (score < 9)  return { label: 'Moderate Day', cls: 'wl-moderate', icon: '🟡' };
  return           { label: 'Heavy Day',   cls: 'wl-heavy',  icon: '🔴' };
}

// ===== SMART SCHEDULING ENGINE =====
function generateSchedule() {
  var tasks = sp.tasks.filter(function(t) { return t.status !== 'completed'; });
  if (!tasks.length) { sp.schedule = []; spSave(); return; }

  var day = getDayName();
  var classes = (sp.routine.days[day] || []).map(function(c) {
    return { start: timeToMin(c.start), end: timeToMin(c.end) };
  });

  // Build free slots: wake time → sleep time, minus class blocks
  var wakeMin  = timeToMin(sp.routine.wakeTime);
  var sleepMin = timeToMin(sp.routine.sleepTime);
  // If sleep is past midnight, it wraps — treat as next-day end
  if (sleepMin <= wakeMin) sleepMin += 1440;

  // Sorted class blocks
  var blocked = classes.slice().sort(function(a, b) { return a.start - b.start; });

  // Build free windows
  var freeWindows = [];
  var cursor = wakeMin;
  blocked.forEach(function(cls) {
    if (cls.start > cursor) freeWindows.push({ start: cursor, end: cls.start });
    cursor = Math.max(cursor, cls.end);
  });
  if (cursor < sleepMin) freeWindows.push({ start: cursor, end: sleepMin });

  // Filter out windows < 30 min (too short to be useful)
  // Keep windows >= 2h for tasks; others are labeled as free gaps
  var usableWindows = freeWindows.filter(function(w) { return (w.end - w.start) >= 60; });

  // Sort tasks: Hard → Medium → Easy, then by priority desc
  var priOrder = { High: 0, Medium: 1, Low: 2 };
  var difOrder = { Hard: 0, Medium: 1, Easy: 2 };
  var sorted = tasks.slice().sort(function(a, b) {
    var ds = difOrder[a.difficulty] - difOrder[b.difficulty];
    if (ds !== 0) return ds;
    return priOrder[a.priority] - priOrder[b.priority];
  });

  // Schedule tasks into windows, adding 15-min breaks after 90min of work
  var scheduled = [];
  var overloaded = [];
  var windowIdx  = 0;
  var windowCursor = usableWindows.length ? usableWindows[0].start : wakeMin;
  var focusSinceBreak = 0;

  sorted.forEach(function(task) {
    var placed = false;

    while (windowIdx < usableWindows.length) {
      var win = usableWindows[windowIdx];
      // Advance cursor to window start if needed
      if (windowCursor < win.start) {
        windowCursor = win.start;
        focusSinceBreak = 0;
      }

      // Insert a break if focus has hit 90 min
      if (focusSinceBreak >= 90) {
        windowCursor += 15;
        focusSinceBreak = 0;
      }

      var taskEnd = windowCursor + task.durationMin;
      if (taskEnd <= win.end) {
        scheduled.push({
          taskId:    task.id,
          title:     task.title,
          difficulty:task.difficulty,
          priority:  task.priority,
          durationMin: task.durationMin,
          startMin:  windowCursor,
          endMin:    taskEnd,
          status:    task.status || 'pending',
        });
        focusSinceBreak += task.durationMin;
        windowCursor = taskEnd;
        placed = true;
        break;
      } else {
        // Move to next window
        windowIdx++;
        if (windowIdx < usableWindows.length) {
          windowCursor = usableWindows[windowIdx].start;
          focusSinceBreak = 0;
        }
      }
    }

    if (!placed) overloaded.push(task);
  });

  sp.schedule   = scheduled;
  sp._overloaded = overloaded;
  spSave();

  // Set up reminders for newly scheduled tasks
  spClearReminders();
  scheduled.forEach(function(s) { spScheduleReminder(s); });

  return overloaded;
}

// ===== REMINDER SYSTEM =====
var spReminderTimeouts = [];

function spClearReminders() {
  spReminderTimeouts.forEach(function(id) { clearTimeout(id); });
  spReminderTimeouts = [];
}

function spScheduleReminder(slot) {
  var now = new Date();
  var nowMin = now.getHours() * 60 + now.getMinutes();

  [30, 15].forEach(function(minsAhead) {
    var fireMin = slot.startMin - minsAhead;
    var deltaMs = (fireMin - nowMin) * 60000;
    if (deltaMs > 0) {
      var id = setTimeout(function() {
        spShowNotification(slot.title, slot.startMin, minsAhead);
      }, deltaMs);
      spReminderTimeouts.push(id);
    }
  });
}

function spShowNotification(title, startMin, minsAhead) {
  var msg = title + ' starts in ' + minsAhead + ' minutes (' + minToTime(startMin) + ')';
  if (window.Notification && Notification.permission === 'granted') {
    new Notification('📚 Study Reminder', { body: msg, icon: 'icon.svg' });
  }
  // Always show in-app toast too
  spShowToast(msg);
}

function spShowToast(msg) {
  var toast = document.createElement('div');
  toast.className = 'sp-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('sp-toast-show'); }, 10);
  setTimeout(function() {
    toast.classList.remove('sp-toast-show');
    setTimeout(function() { toast.remove(); }, 400);
  }, 5000);
}

function spRequestNotifications() {
  if (!window.Notification) return;
  if (Notification.permission === 'default' && !sp.notifAsked) {
    sp.notifAsked = true;
    localStorage.setItem('sp_notif_asked', 'true');
    Notification.requestPermission();
  }
}

// ===== RESCHEDULE MISSED TASK =====
function spReschedule(taskId) {
  var slot = sp.schedule.find(function(s) { return s.taskId === taskId; });
  if (!slot) return;

  var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  var day    = getDayName();
  var classes = (sp.routine.days[day] || []).map(function(c) {
    return { start: timeToMin(c.start), end: timeToMin(c.end) };
  });
  var sleepMin = timeToMin(sp.routine.sleepTime);
  if (sleepMin <= nowMin) { spShowToast('No time left today for rescheduling.'); return; }

  // Find next free gap after now
  var occupied = sp.schedule.map(function(s) { return { start: s.startMin, end: s.endMin }; })
    .concat(classes.map(function(c) { return { start: c.start, end: c.end }; }))
    .sort(function(a, b) { return a.start - b.start; });

  var cursor = nowMin + 5; // 5 min buffer
  var newStart = null;

  // Try gaps
  for (var i = 0; i <= occupied.length; i++) {
    var gapEnd = i < occupied.length ? occupied[i].start : sleepMin;
    if (gapEnd - cursor >= slot.durationMin) {
      newStart = cursor;
      break;
    }
    if (i < occupied.length) cursor = Math.max(cursor, occupied[i].end);
  }

  if (newStart === null) {
    spShowToast('No slot available today. Task moved to tomorrow\'s plan.');
    slot.status = 'deferred';
  } else {
    slot.startMin = newStart;
    slot.endMin   = newStart + slot.durationMin;
    slot.status   = 'rescheduled';
    spShowToast('Rescheduled to ' + minToTime(newStart));
    spClearReminders();
    sp.schedule.forEach(function(s) { spScheduleReminder(s); });
  }

  spSave();
  renderSmartPlanner();
}

// ===== RENDER SMART PLANNER PAGE =====
function renderSmartPlanner() {
  var root = document.getElementById('sp-root');
  if (!root) return;

  var tasks    = sp.tasks;
  var schedule = sp.schedule;
  var day      = getDayName();

  // Analytics
  var total     = schedule.length;
  var completed = schedule.filter(function(s) { return s.status === 'completed'; }).length;
  var missed    = schedule.filter(function(s) {
    var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    return s.status !== 'completed' && s.endMin < nowMin;
  }).length;
  var rate      = total ? Math.round(completed / total * 100) : 0;
  var focusHrs  = (schedule.filter(function(s) { return s.status === 'completed'; })
    .reduce(function(sum, s) { return sum + s.durationMin; }, 0) / 60).toFixed(1);

  // Workload
  var wlScore = calcWorkloadScore(tasks);
  var wl      = workloadLabel(wlScore);

  var html = '';

  // ── TOP ANALYTICS BAR ──
  html += '<div class="sp-analytics-row">' +
    spMetric(total, 'Total Tasks') +
    spMetric(completed, 'Completed') +
    spMetric(missed, 'Missed') +
    spMetric(rate + '%', 'Rate') +
    spMetric(focusHrs + 'h', 'Focus Time') +
  '</div>';

  // ── WORKLOAD SCORE ──
  html += '<div class="sp-workload-bar ' + wl.cls + '">' +
    '<span class="sp-wl-icon">' + wl.icon + '</span>' +
    '<span class="sp-wl-label">' + wl.label + '</span>' +
    '<span class="sp-wl-day">' + day + '</span>' +
  '</div>';

  // ── OVERLOADED WARNING ──
  if (sp._overloaded && sp._overloaded.length) {
    html += '<div class="sp-overload-banner">' +
      '⚠ Overload — ' + sp._overloaded.length + ' task(s) couldn\'t fit today. ' +
      'Consider deferring: ' + sp._overloaded.map(function(t) { return '<b>' + t.title + '</b>'; }).join(', ') +
    '</div>';
  }

  // ── ADD TASK + VIEW TOGGLE ──
  html += '<div class="sp-toolbar">' +
    '<div class="sp-view-toggle">' +
      '<button class="sp-view-btn' + (sp.view === 'timeline' ? ' active' : '') + '" onclick="spSetView(\'timeline\')">Timeline</button>' +
      '<button class="sp-view-btn' + (sp.view === 'card' ? ' active' : '') + '" onclick="spSetView(\'card\')">Cards</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px">' +
      '<button class="btn-ghost" onclick="openModal(\'sp-modal-routine\')" style="font-size:12px">⚙ Routine</button>' +
      '<button class="btn-primary" onclick="openModal(\'sp-modal-task\')">+ Add Task</button>' +
    '</div>' +
  '</div>';

  // ── SCHEDULE ──
  if (!schedule.length && !tasks.length) {
    html += '<div class="empty-state">No tasks yet. Add tasks and generate your schedule!</div>';
  } else if (!schedule.length && tasks.length) {
    html += '<div class="empty-state" style="padding:2rem">' +
      '<p style="margin-bottom:1rem;color:var(--text-muted)">Tasks added. Ready to schedule?</p>' +
      '<button class="btn-primary" onclick="spGenerate()">Generate Schedule</button>' +
    '</div>';
  } else {
    html += sp.view === 'timeline' ? spRenderTimeline(schedule) : spRenderCards(schedule);
  }

  // ── TASK LIST (input area) ──
  if (tasks.length) {
    html += '<div class="card" style="margin-top:1.25rem">' +
      '<div class="card-header">' +
        '<span class="card-title">Today\'s Tasks</span>' +
        '<button class="btn-primary" onclick="spGenerate()" style="font-size:12px;padding:6px 12px">↻ Regenerate</button>' +
      '</div>' +
      tasks.map(function(t) {
        var difCls = 'sp-badge-' + t.difficulty.toLowerCase();
        var priCls = t.priority === 'High' ? 'priority-high' : t.priority === 'Low' ? 'priority-low' : 'priority-med';
        return '<div class="sp-task-input-row">' +
          '<div style="flex:1;min-width:0">' +
            '<span class="list-main">' + t.title + '</span>' +
            '<div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;align-items:center">' +
              '<span class="sp-badge ' + difCls + '">' + t.difficulty + '</span>' +
              '<span class="' + priCls + '">' + t.priority + '</span>' +
              '<span style="font-size:11px;color:var(--text-dim)">' + spFmtDuration(t.durationMin) + '</span>' +
              (t.deadline ? '<span style="font-size:11px;color:var(--text-dim)">Due: ' + t.deadline + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<button class="btn-icon" onclick="spDeleteTask(' + t.id + ')">✕</button>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  root.innerHTML = html;
}

function spSetView(v) {
  sp.view = v;
  renderSmartPlanner();
}

function spMetric(val, label) {
  return '<div class="sp-metric"><div class="sp-metric-val">' + val + '</div><div class="sp-metric-lbl">' + label + '</div></div>';
}

function spFmtDuration(min) {
  if (min < 60) return min + 'm';
  var h = Math.floor(min / 60);
  var m = min % 60;
  return h + 'h' + (m ? ' ' + m + 'm' : '');
}

// ── TIMELINE VIEW ──
function spRenderTimeline(schedule) {
  var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  var sorted = schedule.slice().sort(function(a, b) { return a.startMin - b.startMin; });

  var html = '<div class="sp-timeline">';
  sorted.forEach(function(s) {
    var isPast    = s.endMin < nowMin && s.status !== 'completed';
    var isNow     = s.startMin <= nowMin && s.endMin >= nowMin;
    var difCls    = 'sp-badge-' + s.difficulty.toLowerCase();
    var statusCls = s.status === 'completed' ? 'sp-slot-done' : isPast ? 'sp-slot-missed' : isNow ? 'sp-slot-now' : '';
    var priCls    = s.priority === 'High' ? 'priority-high' : s.priority === 'Low' ? 'priority-low' : 'priority-med';

    html += '<div class="sp-timeline-row">' +
      '<div class="sp-timeline-time">' +
        '<span>' + minToTime(s.startMin) + '</span>' +
        '<span class="sp-tl-dur">' + spFmtDuration(s.durationMin) + '</span>' +
      '</div>' +
      '<div class="sp-timeline-dot-col">' +
        '<div class="sp-tl-dot ' + (isNow ? 'now' : s.status === 'completed' ? 'done' : '') + '"></div>' +
        '<div class="sp-tl-line"></div>' +
      '</div>' +
      '<div class="sp-slot ' + statusCls + '">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap">' +
          '<div>' +
            '<div class="list-main" style="margin-bottom:5px">' + s.title + '</div>' +
            '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
              '<span class="sp-badge ' + difCls + '">' + s.difficulty + '</span>' +
              '<span class="' + priCls + '">' + s.priority + '</span>' +
              '<span style="font-size:11px;color:var(--text-dim)">' + minToTime(s.startMin) + ' → ' + minToTime(s.endMin) + '</span>' +
              (s.status === 'rescheduled' ? '<span style="font-size:11px;color:var(--warn)">Rescheduled</span>' : '') +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0">' +
            (s.status !== 'completed'
              ? '<button class="btn-icon sp-btn-focus" onclick="spStartFocus(' + JSON.stringify(s).replace(/"/g, '&quot;') + ')" title="Start Focus Session">▶ Focus</button>'
              : '') +
            (isPast && s.status !== 'completed'
              ? '<button class="btn-icon" onclick="spReschedule(\'' + s.taskId + '\')" style="color:var(--warn);border-color:var(--warn)">↻ Reschedule</button>'
              : '') +
            (s.status !== 'completed'
              ? '<button class="btn-icon" onclick="spMarkDone(\'' + s.taskId + '\')" style="font-size:11px">✓ Done</button>'
              : '<span style="font-size:11px;color:var(--success);font-family:var(--font-mono)">✓ Done</span>') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  });
  html += '</div>';
  return html;
}

// ── CARD VIEW ──
function spRenderCards(schedule) {
  var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  var sorted = schedule.slice().sort(function(a, b) { return a.startMin - b.startMin; });

  var html = '<div class="sp-cards-grid">';
  sorted.forEach(function(s) {
    var isPast = s.endMin < nowMin && s.status !== 'completed';
    var isNow  = s.startMin <= nowMin && s.endMin >= nowMin;
    var difCls = 'sp-badge-' + s.difficulty.toLowerCase();
    var borderCls = s.status === 'completed' ? 'border-color:var(--success)'
                  : isPast ? 'border-color:var(--danger)'
                  : isNow  ? 'border-color:var(--accent)'
                  : '';

    html += '<div class="sp-card-item" style="' + borderCls + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">' +
        '<span class="sp-badge ' + difCls + '">' + s.difficulty + '</span>' +
        (isNow ? '<span style="font-size:11px;color:var(--accent);font-family:var(--font-mono)">● NOW</span>' : '') +
        (s.status === 'completed' ? '<span style="font-size:11px;color:var(--success);font-family:var(--font-mono)">✓ Done</span>' : '') +
      '</div>' +
      '<div class="list-main" style="margin-bottom:6px;font-size:14px">' + s.title + '</div>' +
      '<div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;font-family:var(--font-mono)">' +
        minToTime(s.startMin) + ' – ' + minToTime(s.endMin) + ' · ' + spFmtDuration(s.durationMin) +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        (s.status !== 'completed'
          ? '<button class="btn-primary" style="font-size:11px;padding:5px 10px" onclick="spStartFocus(' + JSON.stringify(s).replace(/"/g, '&quot;') + ')">▶ Focus</button>' : '') +
        (isPast && s.status !== 'completed'
          ? '<button class="btn-ghost" style="font-size:11px;padding:5px 10px" onclick="spReschedule(\'' + s.taskId + '\')">↻ Reschedule</button>' : '') +
        (s.status !== 'completed'
          ? '<button class="btn-ghost" style="font-size:11px;padding:5px 10px" onclick="spMarkDone(\'' + s.taskId + '\')">✓ Done</button>' : '') +
      '</div>' +
    '</div>';
  });
  html += '</div>';
  return html;
}

// ===== MARK DONE =====
function spMarkDone(taskId) {
  var slot = sp.schedule.find(function(s) { return s.taskId == taskId; });
  if (slot) { slot.status = 'completed'; spSave(); renderSmartPlanner(); }
  var task = sp.tasks.find(function(t) { return t.id == taskId; });
  if (task) { task.status = 'completed'; spSave(); }
}

// ===== FOCUS INTEGRATION =====
function spStartFocus(slot) {
  if (typeof slot === 'string') slot = JSON.parse(slot);
  // Preload timer with task duration
  timerState.mode = 'custom';
  timerState.durations['custom'] = slot.durationMin * 60;
  timerState.remaining = slot.durationMin * 60;
  timerState._spTask = slot.title;
  // Navigate to timer page
  var timerNav = document.querySelector('[data-page="timer"]');
  navigate('timer', timerNav);
}

// ===== ADD / DELETE TASK =====
function spAddTask() {
  var title    = document.getElementById('sp-t-title').value.trim();
  var durH     = parseInt(document.getElementById('sp-t-hours').value)   || 0;
  var durM     = parseInt(document.getElementById('sp-t-minutes').value) || 0;
  var diff     = document.getElementById('sp-t-diff').value;
  var pri      = document.getElementById('sp-t-pri').value;
  var deadline = document.getElementById('sp-t-deadline').value;

  if (!title) return;
  var durationMin = durH * 60 + durM;
  if (durationMin < 15) durationMin = 30; // minimum 30 min

  sp.tasks.push({
    id:          Date.now(),
    title:       title,
    durationMin: durationMin,
    difficulty:  diff,
    priority:    pri,
    deadline:    deadline,
    status:      'pending',
  });
  spSave();
  closeModal('sp-modal-task');

  // Reset form
  ['sp-t-title','sp-t-hours','sp-t-minutes','sp-t-deadline'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });

  generateSchedule();
  renderSmartPlanner();
  spRequestNotifications();
}

function spDeleteTask(id) {
  sp.tasks    = sp.tasks.filter(function(t) { return t.id !== id; });
  sp.schedule = sp.schedule.filter(function(s) { return s.taskId !== id; });
  spSave();
  renderSmartPlanner();
}

function spGenerate() {
  generateSchedule();
  renderSmartPlanner();
}

// ===== ROUTINE EDITOR =====
function renderRoutineModal() {
  var root = document.getElementById('sp-routine-body');
  if (!root) return;

  var html = '<div class="form-group">' +
    '<label>Wake Time</label>' +
    '<input type="time" class="input" id="sp-r-wake" value="' + sp.routine.wakeTime + '">' +
  '</div>' +
  '<div class="form-group">' +
    '<label>Sleep Time</label>' +
    '<input type="time" class="input" id="sp-r-sleep" value="' + sp.routine.sleepTime + '">' +
  '</div>' +
  '<div class="form-group">' +
    '<label>Sleep Hours (for scheduling buffer)</label>' +
    '<input type="number" class="input" id="sp-r-sleephis" value="' + sp.routine.sleepHours + '" min="4" max="12">' +
  '</div>';

  var days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  days.forEach(function(day) {
    var classes = sp.routine.days[day] || [];
    html += '<div class="sp-routine-day">' +
      '<div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:6px;text-transform:uppercase">' + day + '</div>' +
      '<div id="sp-r-' + day + '-slots">' +
        classes.map(function(c, i) {
          return '<div class="sp-routine-slot">' +
            '<input type="time" class="input" style="flex:1" value="' + c.start + '" id="sp-r-' + day + '-' + i + '-s">' +
            '<span style="color:var(--text-dim);font-size:12px">→</span>' +
            '<input type="time" class="input" style="flex:1" value="' + c.end   + '" id="sp-r-' + day + '-' + i + '-e">' +
            '<button class="btn-icon" onclick="spRemoveClass(\'' + day + '\',' + i + ')">✕</button>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<button class="btn-ghost" style="font-size:11px;padding:5px 10px;margin-top:6px" onclick="spAddClass(\'' + day + '\')">+ Add class</button>' +
    '</div>';
  });

  root.innerHTML = html;
}

function spAddClass(day) {
  if (!sp.routine.days[day]) sp.routine.days[day] = [];
  sp.routine.days[day].push({ start: '09:00', end: '10:30' });
  renderRoutineModal();
}

function spRemoveClass(day, idx) {
  sp.routine.days[day].splice(idx, 1);
  renderRoutineModal();
}

function spSaveRoutine() {
  sp.routine.wakeTime   = document.getElementById('sp-r-wake').value   || sp.routine.wakeTime;
  sp.routine.sleepTime  = document.getElementById('sp-r-sleep').value  || sp.routine.sleepTime;
  sp.routine.sleepHours = parseInt(document.getElementById('sp-r-sleephis').value) || 6;

  var days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  days.forEach(function(day) {
    var classes = sp.routine.days[day] || [];
    sp.routine.days[day] = classes.map(function(c, i) {
      var s = document.getElementById('sp-r-' + day + '-' + i + '-s');
      var e = document.getElementById('sp-r-' + day + '-' + i + '-e');
      return { start: s ? s.value : c.start, end: e ? e.value : c.end };
    });
  });

  spSave();
  closeModal('sp-modal-routine');
  generateSchedule();
  renderSmartPlanner();
}

// ===== EXPOSE GLOBALS =====
window.renderSmartPlanner = renderSmartPlanner;
window.spSetView          = spSetView;
window.spGenerate         = spGenerate;
window.spAddTask          = spAddTask;
window.spDeleteTask       = spDeleteTask;
window.spMarkDone         = spMarkDone;
window.spReschedule       = spReschedule;
window.spStartFocus       = spStartFocus;
window.spAddClass         = spAddClass;
window.spRemoveClass      = spRemoveClass;
window.spSaveRoutine      = spSaveRoutine;
window.renderRoutineModal = renderRoutineModal;
