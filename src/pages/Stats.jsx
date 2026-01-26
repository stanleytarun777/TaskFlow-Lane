import React, { useMemo, useState } from "react";
import {
  RANGE_OPTIONS,
  computePriorityBreakdown,
  computeSummaryMetrics,
  filterTasksByWindow,
  formatRangeDisplay,
  getRangeWindow,
  shiftWindow,
} from "../utils/stats";

function Stats({ tasks = [] }) {
  const [selectedRange, setSelectedRange] = useState("weekly");

  const activeWindow = useMemo(() => getRangeWindow(selectedRange), [selectedRange]);
  const previousWindow = useMemo(() => shiftWindow(activeWindow, -1), [activeWindow]);

  const currentTasks = useMemo(
    () => filterTasksByWindow(tasks, activeWindow),
    [tasks, activeWindow]
  );
  const previousTasks = useMemo(
    () => filterTasksByWindow(tasks, previousWindow),
    [tasks, previousWindow]
  );

  const summary = useMemo(() => computeSummaryMetrics(currentTasks), [currentTasks]);
  const previousSummary = useMemo(() => computeSummaryMetrics(previousTasks), [previousTasks]);
  const activeRangeTasks = useMemo(
    () => currentTasks.filter((task) => !task.completed),
    [currentTasks]
  );

  const priorityBreakdown = useMemo(
    () => computePriorityBreakdown(activeRangeTasks),
    [activeRangeTasks]
  );

  const completionDelta = summary.completionRate - previousSummary.completionRate;
  const volumeDelta = summary.total - previousSummary.total;
  const overdueDelta = summary.overdue - previousSummary.overdue;
  const focusDelta = summary.focusRate - previousSummary.focusRate;
  const coverageRate = tasks.length ? Math.round((currentTasks.length / tasks.length) * 100) : 0;

  const topPriority = useMemo(() => {
    return [...priorityBreakdown].sort((a, b) => b.count - a.count)[0] ?? null;
  }, [priorityBreakdown]);

  const rangeDisplay = formatRangeDisplay(activeWindow);
  const rangeDescription = activeWindow?.description ?? "";

  return (
    <div className="page-container stats-view">
      <section className="stats-hero glass-panel" aria-labelledby="stats-heading">
        <div>
          <p className="eyebrow-label">Statistics</p>
          <h1 id="stats-heading" className="page-hero__heading">Performance analytics</h1>
          <p className="muted stats-hero__description">{rangeDescription}</p>
          <p className="stats-hero__range">{rangeDisplay}</p>
        </div>
        <div className="stats-range-selector" role="group" aria-label="Time range filters">
          {RANGE_OPTIONS.map((option) => {
            const isActive = option.key === selectedRange;
            return (
              <button
                key={option.key}
                type="button"
                className={`range-chip${isActive ? " is-active" : ""}`}
                onClick={() => setSelectedRange(option.key)}
                aria-pressed={isActive}
              >
                <span>{option.label}</span>
                <span>{option.caption}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="stats-grid" aria-label="Summary metrics">
        <article className="stat-card">
          <div className="stat-card__meta">
            <p className="stat-card__label">Completion rate</p>
            <DeltaBadge value={completionDelta} suffix="%" />
          </div>
          <p className="stat-card__value">{summary.completionRate}%</p>
          <p className="stat-card__hint">{summary.completed} finished</p>
          <LinearGauge value={summary.completionRate} />
        </article>

        <article className="stat-card">
          <div className="stat-card__meta">
            <p className="stat-card__label">Focus load</p>
            <DeltaBadge value={focusDelta} suffix="%" />
          </div>
          <p className="stat-card__value">{summary.focusRate}%</p>
          <p className="stat-card__hint">{summary.active} active tasks</p>
          <LinearGauge value={summary.focusRate} accent="var(--brand)" />
        </article>

        <article className="stat-card">
          <div className="stat-card__meta">
            <p className="stat-card__label">Task volume</p>
            <DeltaBadge value={volumeDelta} />
          </div>
          <p className="stat-card__value">{summary.total}</p>
          <p className="stat-card__hint">{coverageRate}% of all tasks</p>
          <LinearGauge value={coverageRate} accent="var(--info)" />
        </article>

        <article className="stat-card">
          <div className="stat-card__meta">
            <p className="stat-card__label">Overdue risk</p>
            <DeltaBadge value={overdueDelta} isInverse />
          </div>
          <p className="stat-card__value">{summary.overdue}</p>
          <p className="stat-card__hint">Need attention</p>
          <LinearGauge value={summary.overdue && summary.total ? Math.round((summary.overdue / summary.total) * 100) : 0} accent="var(--danger)" />
        </article>
      </section>

      <section className="stats-lower-grid">
        <article className="chart-card stats-priority-card">
          <header className="chart-card__header">
            <div>
              <p className="eyebrow-label">Priority split</p>
              <h2>Where the effort lives</h2>
            </div>
            <span className="chart-card__badge">{activeRangeTasks.length} active tasks</span>
          </header>
          <ul className="priority-list">
            {priorityBreakdown.map((priority) => (
              <li key={priority.key}>
                <div className="priority-list__label">
                  <span className={`priority-chip priority-${priority.key}`}>
                    {priority.label}
                  </span>
                  <strong>{priority.count}</strong>
                </div>
                <div className="priority-progress">
                  <span style={{ width: `${priority.percentage}%` }} />
                </div>
                <p className="priority-list__percent">{priority.percentage}%</p>
              </li>
            ))}
          </ul>

          <ul className="stats-insights">
            <li>
              <span className="stats-insights__label">Dominant priority</span>
              <strong>{topPriority ? `${topPriority.label} · ${topPriority.count}` : "No data"}</strong>
              <p className="muted">{topPriority ? `${topPriority.percentage}% of range` : "Add tasks to calculate"}</p>
            </li>
            <li>
              <span className="stats-insights__label">Range overview</span>
              <strong>{rangeDisplay || "Active window"}</strong>
              <p className="muted">{summary.total} tracked · {summary.completed} done</p>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}

function DeltaBadge({ value, suffix = "", isInverse = false }) {
  const numeric = Number.isFinite(value) ? value : 0;
  if (numeric === 0) {
    return <span className="stat-delta">No change</span>;
  }
  const direction = numeric > 0 ? 1 : -1;
  const displayValue = `${direction > 0 ? "+" : "-"}${Math.abs(numeric)}${suffix}`;
  const polarityClass = direction > 0 ? "is-positive" : "is-negative";
  const variant = isInverse ? (direction > 0 ? "is-negative" : "is-positive") : polarityClass;

  return (
    <span className={`stat-delta ${variant}`}>
      {displayValue}
      <span className="stat-delta__hint">vs prior</span>
    </span>
  );
}

function LinearGauge({ value = 0, accent = "var(--brand-accent)" }) {
  const width = clamp(value, 0, 100);
  return (
    <div className="stat-gauge" role="img" aria-label={`Progress ${width}%`}>
      <span style={{ width: `${width}%`, background: accent }} />
    </div>
  );
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export default Stats;
