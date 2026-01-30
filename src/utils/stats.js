const RANGE_CONFIG = {
  daily: {
    key: "daily",
    label: "Today",
    caption: "24h",
    description: "Focused view on everything due before midnight.",
    buckets: 6,
  },
  weekly: {
    key: "weekly",
    label: "This Week",
    caption: "7d",
    description: "Seven-day sprint across your current commitments.",
    buckets: 7,
  },
  monthly: {
    key: "monthly",
    label: "This Month",
    caption: "30d",
    description: "Month-long planning horizon for deeper forecasting.",
    buckets: 5,
  },
  yearly: {
    key: "yearly",
    label: "This Year",
    caption: "12mo",
    description: "High-level overview of progress across the year.",
    buckets: 12,
  },
};

const PRIORITY_ORDER = ["high", "medium", "low"];

export const RANGE_OPTIONS = Object.values(RANGE_CONFIG);

export function getRangeWindow(rangeKey, reference = new Date()) {
  const config = RANGE_CONFIG[rangeKey] ?? RANGE_CONFIG.weekly;
  const base = toDate(reference);
  let start;

  switch (config.key) {
    case "daily":
      start = startOfDay(base);
      break;
    case "monthly":
      start = startOfMonth(base);
      break;
    case "yearly":
      start = startOfYear(base);
      break;
    case "weekly":
    default:
      start = startOfWeek(base);
      break;
  }

  const end = createEndForRange(config.key, start);
  const durationMs = end.getTime() - start.getTime();
  return {
    ...config,
    start,
    end,
    durationMs,
  };
}

export function shiftWindow(rangeWindow, direction = -1) {
  if (!rangeWindow) {
    return null;
  }
  const offset = getWindowDuration(rangeWindow);
  const delta = offset * direction;
  const nextStart = new Date(rangeWindow.start.getTime() + delta);
  const nextEnd = new Date(rangeWindow.end.getTime() + delta);
  return {
    ...rangeWindow,
    start: nextStart,
    end: nextEnd,
  };
}

export function filterTasksByWindow(tasks = [], window) {
  if (!window?.start || !window?.end) {
    return [];
  }
  const startMs = window.start.getTime();
  const endMs = window.end.getTime();
  return tasks.filter((task) => {
    // Include tasks without a due date in stats
    if (!task?.dueDate) {
      return true;
    }
    const timestamp = new Date(task.dueDate).getTime();
    if (Number.isNaN(timestamp)) {
      return true;  // Include tasks with invalid dates too
    }
    return timestamp >= startMs && timestamp < endMs;
  });
}

export function computeSummaryMetrics(tasks = [], reference = Date.now()) {
  const nowTs = reference instanceof Date ? reference.getTime() : Number(reference) || Date.now();
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const active = Math.max(total - completed, 0);
  const overdue = tasks.filter((task) => !task.completed && isBefore(task.dueDate, nowTs)).length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const focusRate = total ? Math.round((active / total) * 100) : 0;

  return {
    total,
    completed,
    active,
    overdue,
    completionRate,
    focusRate,
  };
}

export function computePriorityBreakdown(tasks = []) {
  const total = tasks.length || 1;
  return PRIORITY_ORDER.map((priority) => {
    const count = tasks.filter((task) => (task.priority ?? "medium") === priority).length;
    return {
      key: priority,
      label: priority.charAt(0).toUpperCase() + priority.slice(1),
      count,
      percentage: Math.round((count / total) * 100),
    };
  });
}

export function buildTrendSeries(tasks = [], window) {
  if (!window?.start || !window?.end) {
    return { buckets: [] };
  }
  const config = RANGE_CONFIG[window.key] ?? RANGE_CONFIG.weekly;
  const bucketCount = config.buckets;
  if (!bucketCount) {
    return { buckets: [] };
  }

  const startMs = window.start.getTime();
  const endMs = window.end.getTime();
  const duration = Math.max(endMs - startMs, 1);
  const bucketSize = duration / bucketCount;
  const monthFormatter = getFormatter({ month: "short" });
  const dayFormatter = getFormatter({ day: "numeric" });
  const timeFormatter = getFormatter({ hour: "numeric", minute: "2-digit" });

  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    index,
    label: "",
    total: 0,
    completed: 0,
    completionPercent: 0,
    axis: {
      month: "",
      day: "",
      monthDay: "",
      time: "",
    },
    timestamp: null,
  }));

  const prepared = tasks
    .map((task) => ({
      ...task,
      dueTimestamp: task?.dueDate ? new Date(task.dueDate).getTime() : NaN,
    }))
    .filter((task) => Number.isFinite(task.dueTimestamp));

  prepared.forEach((task) => {
    if (task.dueTimestamp < startMs || task.dueTimestamp >= endMs) {
      return;
    }
    const rawIndex = Math.floor((task.dueTimestamp - startMs) / bucketSize);
    const bucketIndex = clamp(rawIndex, 0, bucketCount - 1);
    const bucket = buckets[bucketIndex];
    bucket.total += 1;
    if (task.completed) {
      bucket.completed += 1;
    }
  });

    buckets.forEach((bucket, index) => {
      const bucketStart = new Date(startMs + bucketSize * index);
      const monthLabel = monthFormatter.format(bucketStart);
      const dayLabel = dayFormatter.format(bucketStart);
      bucket.label = formatBucketLabel(config.key, bucketStart);
      bucket.timestamp = bucketStart;
      bucket.axis = {
        month: monthLabel,
        day: dayLabel,
        monthDay: `${monthLabel} ${dayLabel}`,
        time: timeFormatter.format(bucketStart),
      };
    bucket.completionPercent = bucket.total ? Math.round((bucket.completed / bucket.total) * 100) : 0;
  });

    return { buckets, start: window.start, end: window.end, rangeKey: window.key };
}

export function formatRangeDisplay(window) {
  if (!window?.start || !window?.end) {
    return "";
  }
  const formatOptions = window.start.getFullYear() === window.end.getFullYear()
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" };
  const formatter = getFormatter(formatOptions);
  const endDisplay = new Date(window.end.getTime() - 1);
  return `${formatter.format(window.start)} – ${formatter.format(endDisplay)}`;
}

function formatBucketLabel(rangeKey, start) {
  switch (rangeKey) {
    case "yearly":
      return getFormatter({ month: "short" }).format(start);
    case "daily":
      return getFormatter({ hour: "numeric", minute: "2-digit" }).format(start);
    case "monthly":
    case "weekly":
    default:
      return getFormatter({ month: "short", day: "numeric" }).format(start);
  }
}

function createEndForRange(key, start) {
  const end = new Date(start);
  switch (key) {
    case "daily":
      end.setDate(end.getDate() + 1);
      break;
    case "weekly":
      end.setDate(end.getDate() + 7);
      break;
    case "monthly":
      end.setMonth(end.getMonth() + 1);
      break;
    case "yearly":
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      end.setDate(end.getDate() + 7);
      break;
  }
  return end;
}

function startOfDay(date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function startOfWeek(date) {
  const clone = startOfDay(date);
  const day = clone.getDay();
  const diff = (day + 6) % 7;
  clone.setDate(clone.getDate() - diff);
  return clone;
}

function startOfMonth(date) {
  const clone = startOfDay(date);
  clone.setDate(1);
  return clone;
}

function startOfYear(date) {
  const clone = startOfDay(date);
  clone.setMonth(0, 1);
  return clone;
}

function toDate(input) {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }
  const date = new Date(input ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function isBefore(value, pivot) {
  if (!value) {
    return false;
  }
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return timestamp < pivot;
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

function getFormatter(options) {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat === "undefined") {
    return {
      format: (date) => date.toLocaleDateString(),
    };
  }
  return new Intl.DateTimeFormat(undefined, options);
}

function getWindowDuration(rangeWindow) {
  if (typeof rangeWindow.durationMs === "number" && Number.isFinite(rangeWindow.durationMs)) {
    return rangeWindow.durationMs;
  }
  const startMs = rangeWindow.start?.getTime?.() ?? 0;
  const endMs = rangeWindow.end?.getTime?.() ?? startMs;
  const computed = endMs - startMs;
  return Number.isFinite(computed) ? computed : 0;
}
