import React, { useCallback, useMemo, useState } from "react";
import "./Calendar.css";

export default function Calendar({ tasks, localTimes, initialView = "month" }) {
  const [view, setView] = useState(initialView); // 'day' | 'month' | 'year'
  const [cursor, setCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [expanded, setExpanded] = useState(() => new Set());
  const resetExpanded = useCallback(() => setExpanded(new Set()), []);
  const cursorY = cursor.getFullYear();
  const cursorM = cursor.getMonth();
  const cursorD = cursor.getDate();

  const tasksByDate = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      const d = getDateKey(t?.due_date ?? t?.dueDate);
      if (!d) return;
      const arr = map.get(d) || [];
      arr.push(t);
      map.set(d, arr);
    });
    return map;
  }, [tasks]);

  function changeMonth(delta) {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + delta);
    setCursor(d);
    resetExpanded();
  }
  function changeDay(delta) {
    const d = new Date(cursor);
    d.setDate(d.getDate() + delta);
    setCursor(d);
    resetExpanded();
  }
  function changeYear(delta) {
    const d = new Date(cursor);
    d.setFullYear(d.getFullYear() + delta);
    setCursor(d);
    resetExpanded();
  }

  const handleViewChange = useCallback((nextView) => {
    setView(nextView);
    resetExpanded();
  }, [resetExpanded]);

  // ICS export removed per request

  function goToToday() {
    const t = new Date();
    setCursor(new Date(t.getFullYear(), t.getMonth(), t.getDate()));
    handleViewChange("month");
  }

  function renderMonth() {
    const start = new Date(cursorY, cursorM, 1);
    const startDay = start.getDay(); // 0-6
    const daysInMonth = new Date(cursorY, cursorM + 1, 0).getDate();
    const today = new Date();
    const tY = today.getFullYear();
    const tM = today.getMonth();
    const tD = today.getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const label = `${start.toLocaleString(undefined, { month: 'long' })} ${cursorY}`;
    return (
      <div className="calendar-month">
        <div className="calendar-toolbar">
          <button type="button" onClick={() => changeMonth(-1)} className="ghost-btn calendar-nav-btn">◀</button>
          <div className="calendar-title">{label}</div>
          <button type="button" onClick={() => changeMonth(1)} className="ghost-btn calendar-nav-btn">▶</button>
        </div>
        <div className="calendar-grid-shell">
          <div className="calendar-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((w) => (<div key={w} className="calendar-weekday">{w}</div>))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="calendar-cell empty" />;
              const dateStr = `${cursorY}-${String(cursorM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
              const list = tasksByDate.get(dateStr) || [];
              const isToday = (cursorY === tY && cursorM === tM && d === tD);
              const isSelected = (d === cursorD);
              const cls = `calendar-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${list.length ? ' has-tasks' : ''} clickable`;
              // Determine a single priority level for the day: high > medium > low
              let dayPriority = null;
              if (list.length) {
                const hasHigh = list.some(t => t.priority === 'high');
                const hasMedium = list.some(t => t.priority === 'medium');
                dayPriority = hasHigh ? 'high' : hasMedium ? 'medium' : 'low';
              }
              return (
                <div
                  key={i}
                  className={cls}
                  onClick={() => {
                    setCursor(new Date(cursorY, cursorM, d));
                    handleViewChange("day");
                  }}
                >
                  <div className="cell-day">{d}</div>
                  {dayPriority ? <div className={`priority-bar ${dayPriority}`} aria-hidden="true" /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderDay() {
    const label = cursor.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const dateStr = `${cursorY}-${String(cursorM+1).padStart(2,'0')}-${String(cursorD).padStart(2,'0')}`;
    const list = tasksByDate.get(dateStr) || [];
    const toggleExpanded = (id) => {
      setExpanded(prev => {
        const s = new Set(prev);
        if (s.has(id)) s.delete(id); else s.add(id);
        return s;
      });
    };
    const onKeyToggle = (e, id) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(id); }
    };
    return (
      <div className="calendar-day">
        <div className="calendar-toolbar">
          <button type="button" onClick={() => changeDay(-1)} className="ghost-btn calendar-nav-btn">◀</button>
          <div className="calendar-title">{label}</div>
          <button type="button" onClick={() => changeDay(1)} className="ghost-btn calendar-nav-btn">▶</button>
        </div>
        <div className="day-list">
          {list.length === 0 ? (
            <div className="empty">No tasks scheduled.</div>
          ) : (
              list.map((t) => {
              const fallbackTime = formatTimeLabel(t?.due_date ?? t?.dueDate);
              const timeLabel = localTimes?.[t.id] || fallbackTime;
              const isExpanded = expanded.has(t.id);
                const priorityLabel = t.priority ? `${t.priority.slice(0, 1).toUpperCase()}${t.priority.slice(1)} priority` : "";
                return (
                  <div key={t.id} className={`day-item-wrap${isExpanded ? " is-expanded" : ""}`}>
                  <div
                    className={`day-item clickable${isExpanded ? ' expanded' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(t.id)}
                    onKeyDown={(e) => onKeyToggle(e, t.id)}
                  >
                    <div className="title-stack">
                      <div className="title">{t.title}</div>
                      {!isExpanded && (
                        <div className="title-time">Due time: {timeLabel || "—"}</div>
                      )}
                    </div>
                    <div className={`priority-badge ${t.priority}`}>{priorityLabel}</div>
                  </div>
                  {isExpanded && (
                    <div className="calendar-task-details">
                      <div className="task-detail-head">Details</div>
                      <div className="task-detail-body">
                        {t.description ? (
                          <div className="task-detail-description">{t.description}</div>
                        ) : (
                          <div className="task-detail-description is-empty">No description.</div>
                        )}
                        <div className="task-detail-meta"><strong>Due:</strong> {label}</div>
                        <div className="task-detail-meta"><strong>Time:</strong> {timeLabel || "—"}</div>
                        <div className="task-detail-meta"><strong>Priority:</strong> {t.priority}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderYear() {
    const months = Array.from({ length: 12 }, (_, i) => new Date(cursorY, i, 1));
    return (
      <div className="calendar-year">
        <div className="calendar-toolbar">
          <button type="button" onClick={() => changeYear(-1)} className="ghost-btn calendar-nav-btn">◀</button>
          <div className="calendar-title">{cursorY}</div>
          <button type="button" onClick={() => changeYear(1)} className="ghost-btn calendar-nav-btn">▶</button>
        </div>
        <div className="year-grid">
          {months.map((m) => {
            const days = new Date(cursorY, m.getMonth()+1, 0).getDate();
            let total = 0;
            for (let d = 1; d <= days; d++) {
              const ds = `${cursorY}-${String(m.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
              total += (tasksByDate.get(ds) || []).length;
            }
            return (
              <div
                key={m.getMonth()}
                className="year-cell clickable"
                onClick={() => {
                  setCursor(new Date(cursorY, m.getMonth(), 1));
                  handleViewChange("month");
                }}
              >
                <div className="label">{m.toLocaleString(undefined, { month: 'short' })}</div>
                <div className="count">{total} tasks</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar">
      <div className="calendar-switch" role="tablist" aria-label="Calendar Views">
        <button
          type="button"
          role="tab"
          aria-selected={view === "day"}
          className={`ghost-btn switch-btn${view === "day" ? " is-active" : ""}`}
          onClick={() => handleViewChange("day")}
        >
          Day
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "month"}
          className={`ghost-btn switch-btn${view === "month" ? " is-active" : ""}`}
          onClick={() => handleViewChange("month")}
        >
          Month
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "year"}
          className={`ghost-btn switch-btn${view === "year" ? " is-active" : ""}`}
          onClick={() => handleViewChange("year")}
        >
          Year
        </button>
        <button type="button" className="primary-btn calendar-today-btn" onClick={goToToday} aria-label="Go to Today">
          Today
        </button>
      </div>
      {view === 'day' ? renderDay() : view === 'year' ? renderYear() : renderMonth()}
    </div>
  );
}

function getDateKey(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    }
  }
  return null;
}

function formatTimeLabel(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
