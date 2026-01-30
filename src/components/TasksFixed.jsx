import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";

/**
 * CRITICAL SECURITY: Multi-User Task Isolation
 * 
 * This component implements critical security measures to ensure each user
 * can ONLY access and modify their own tasks. All operations are isolated by user_id.
 * 
 * Security Implementation:
 * 1. Every task query includes .eq("user_id", userId) filter
 * 2. Task creation always includes user_id: user.id
 * 3. Task updates and deletes verified against task owner
 * 4. Supabase RLS policies must enforce user_id matching on tasks table
 * 5. Real-time subscriptions filtered by user_id (in App.jsx)
 * 6. User preferences (priority visibility) isolated by user_id in localStorage
 * 
 * DO NOT remove user_id checks - they are critical for data isolation
 */

const PRIORITY_VISIBILITY_STORAGE_KEY_PREFIX = "taskflow-priority-visibility";

/**
 * getStorageKey - Returns user-scoped storage key for preferences
 * 
 * @param {string} userId - Unique user identifier
 * @returns {string} Storage key with user_id namespace
 */
const getPreferenceStorageKey = (userId) => {
	return userId ? `${PRIORITY_VISIBILITY_STORAGE_KEY_PREFIX}-${userId}` : PRIORITY_VISIBILITY_STORAGE_KEY_PREFIX;
};

export default function TasksFixed({
  user,
  tasks: tasksProp = [],
  onTasksChange,
  isFetchingTasks = false,
  fetchError = "",
  onRefreshTasks,
}) {
  // SECURITY: Extract and verify userId from authenticated user object
  const userId = user?.id ?? null;
  
  // SECURITY: Validate user is authenticated before rendering
  if (!userId) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "var(--text-primary)" }}>
        Please log in to manage tasks.
      </div>
    );
  }

  const [tasks, setTasksState] = useState(tasksProp ?? []);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [menuTaskId, setMenuTaskId] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [editTaskId, setEditTaskId] = useState(null);
  const [editFields, setEditFields] = useState(emptyEditFields());
  const [editDateError, setEditDateError] = useState("");
  const [editTimeError, setEditTimeError] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskHour, setNewTaskHour] = useState("");
  const [newTaskMinute, setNewTaskMinute] = useState("");
  const [newTaskPeriod, setNewTaskPeriod] = useState("AM");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [showPriorityMeta, setShowPriorityMeta] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    const storageKey = getPreferenceStorageKey(userId);
    const stored = window.localStorage.getItem(storageKey);
    return stored === null ? true : stored === "true";
  });
  const [dateError, setDateError] = useState("");
  const [timeError, setTimeError] = useState("");
  const [showTaskAdded, setShowTaskAdded] = useState(false);
  const [taskToastMessage, setTaskToastMessage] = useState("Task added");
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [now, setNow] = useState(Date.now());
  const editTitleRef = useRef(null);
  const editDescriptionRef = useRef(null);
  const newTaskTitleRef = useRef(null);
  const newTaskDescriptionRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const statusToastTimersRef = useRef(new Map());
  const [statusToasts, setStatusToasts] = useState([]);
  const autoHighPriorityRef = useRef(new Set());
  const autoMediumPriorityRef = useRef(new Set());
  const optimisticEditRef = useRef(null);

  const updateTasks = useCallback(
    (updater) => {
      setTasksState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater ?? prev;
        if (onTasksChange) {
          onTasksChange(next);
        }
        return next;
      });
    },
    [onTasksChange]
  );

  useEffect(() => {
    setTasksState(tasksProp ?? []);
  }, [tasksProp]);

  useEffect(() => {
    autoHighPriorityRef.current.clear();
    autoMediumPriorityRef.current.clear();
  }, [userId]);
  useEffect(() => {
    if (!tasks.length) {
      return;
    }
    const dueSoonTasks = tasks.filter(
      (task) =>
        !task.completed &&
        task.priority !== "high" &&
        shouldAutoElevatePriority(task.dueDate, now)
    );
    if (!dueSoonTasks.length) {
      return;
    }
    const dueSoonIds = new Set(dueSoonTasks.map((task) => task.id));
    updateTasks((prev) =>
      prev.map((task) => (dueSoonIds.has(task.id) ? { ...task, priority: "high" } : task))
    );

    if (!userId) {
      return;
    }

    const idsToPersist = dueSoonTasks
      .map((task) => task.id)
      .filter((id) => !autoHighPriorityRef.current.has(id));

    if (!idsToPersist.length) {
      return;
    }

    idsToPersist.forEach((id) => autoHighPriorityRef.current.add(id));

    supabase
      .from("tasks")
      .update({ priority: "high" })
      .in("id", idsToPersist)
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) {
          idsToPersist.forEach((id) => autoHighPriorityRef.current.delete(id));
          setMutationError((prev) => prev || error.message);
        }
      });
  }, [tasks, now, updateTasks, userId]);

  useEffect(() => {
    if (!tasks.length) {
      return;
    }

    const mediumCandidates = tasks.filter(
      (task) => task.priority === "low" && shouldAutoPromoteToMedium(task.dueDate, now)
    );

    if (!mediumCandidates.length) {
      return;
    }

    const mediumIds = new Set(mediumCandidates.map((task) => task.id));
    updateTasks((prev) =>
      prev.map((task) => (mediumIds.has(task.id) ? { ...task, priority: "medium" } : task))
    );

    if (!userId) {
      return;
    }

    const idsToPersist = mediumCandidates
      .map((task) => task.id)
      .filter((id) => !autoMediumPriorityRef.current.has(id));

    if (!idsToPersist.length) {
      return;
    }

    idsToPersist.forEach((id) => autoMediumPriorityRef.current.add(id));

    supabase
      .from("tasks")
      .update({ priority: "medium" })
      .in("id", idsToPersist)
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) {
          idsToPersist.forEach((id) => autoMediumPriorityRef.current.delete(id));
          setMutationError((prev) => prev || error.message);
        }
      });
  }, [tasks, now, updateTasks, userId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const storageKey = getPreferenceStorageKey(userId);
    window.localStorage.setItem(storageKey, String(showPriorityMeta));
    return undefined;
  }, [showPriorityMeta, userId]);

  const resetNewTaskForm = useCallback(() => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskDate("");
    setNewTaskHour("");
    setNewTaskMinute("");
    setNewTaskPeriod("AM");
    setNewTaskPriority("medium");
    if (newTaskTitleRef.current) {
      newTaskTitleRef.current.style.height = "";
    }
    if (newTaskDescriptionRef.current) {
      newTaskDescriptionRef.current.style.height = "";
    }
    setTimeError("");
  }, []);

  const dismissComposer = useCallback(() => {
    setComposerOpen(false);
    resetNewTaskForm();
    setDateError("");
  }, [resetNewTaskForm]);

  const closeEditOverlay = useCallback(() => {
    setEditTaskId(null);
    setEditFields(emptyEditFields());
    setEditDateError("");
    setEditTimeError("");
  }, []);

  const closeTaskMenu = useCallback(() => {
    setMenuTaskId(null);
  }, []);

  const revertOptimisticEdit = useCallback(() => {
    if (!optimisticEditRef.current) {
      return;
    }
    const { id, snapshot } = optimisticEditRef.current;
    updateTasks((prev) => prev.map((task) => (task.id === id ? snapshot : task)));
    optimisticEditRef.current = null;
  }, [updateTasks]);

  const activeMenuTask = useMemo(() => {
    if (!menuTaskId) {
      return null;
    }
    return tasks.find((task) => task.id === menuTaskId) ?? null;
  }, [menuTaskId, tasks]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    if (!composerOpen && !editTaskId && !menuTaskId) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (editTaskId) {
          closeEditOverlay();
        } else if (composerOpen) {
          dismissComposer();
        } else if (menuTaskId) {
          closeTaskMenu();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [composerOpen, editTaskId, menuTaskId, closeEditOverlay, dismissComposer, closeTaskMenu]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    if (!composerOpen && !editTaskId && !menuTaskId) {
      return undefined;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [composerOpen, editTaskId, menuTaskId]);

  const minDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offset = today.getTimezoneOffset();
    const adjusted = new Date(today.getTime() - offset * 60000);
    return adjusted.toISOString().split("T")[0];
  }, []);

  const { filteredTasks, completedCount, activeCount } = useMemo(() => {
    const completed = tasks.filter((t) => t.completed).length;
    const active = tasks.length - completed;

    const filtered = tasks.filter((task) => {
      if (filter === "active" && task.completed) return false;
      if (filter === "completed" && !task.completed) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    return { filteredTasks: filtered, completedCount: completed, activeCount: active };
  }, [tasks, filter, search]);

  const visibleTasks = filteredTasks;
  const disableMutations = isMutating || isFetchingTasks;
  const lastVisibleTaskId = visibleTasks.length ? visibleTasks[visibleTasks.length - 1].id : null;
  const editingLastTask = Boolean(editTaskId && editTaskId === lastVisibleTaskId);

  const autoResizeTextarea = useCallback((node) => {
    if (!node) return;
    requestAnimationFrame(() => {
      // Reset height before measuring scroll height to ensure shrink also works
      node.style.height = "auto";
      node.style.height = `${node.scrollHeight}px`;
    });
  }, []);

  const handleOverlayDismiss = useCallback(() => {
    if (disableMutations) return;
    dismissComposer();
  }, [disableMutations, dismissComposer]);

  const handleEditOverlayDismiss = useCallback(() => {
    if (disableMutations) return;
    closeEditOverlay();
  }, [disableMutations, closeEditOverlay]);

  useEffect(() => {
    if (!editTaskId) {
      return;
    }
    if (editTitleRef.current) {
      autoResizeTextarea(editTitleRef.current);
    }
    if (editDescriptionRef.current) {
      autoResizeTextarea(editDescriptionRef.current);
    }
  }, [editTaskId, editFields.title, editFields.description, autoResizeTextarea]);

  useEffect(() => {
    if (!composerOpen) {
      return;
    }
    autoResizeTextarea(newTaskTitleRef.current);
    autoResizeTextarea(newTaskDescriptionRef.current);
  }, [composerOpen, newTaskTitle, newTaskDescription, autoResizeTextarea]);

  const triggerTaskSavedToast = useCallback((message = "Task added") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setTaskToastMessage(message);
    setShowTaskAdded(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowTaskAdded(false);
      toastTimeoutRef.current = null;
    }, 1800);
  }, []);

  const triggerTaskStatusToast = useCallback((variant = "done") => {
    const toastId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    setStatusToasts((prev) => [...prev, { id: toastId, variant }]);
    const schedule = (handler) => {
      if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
        return window.setTimeout(handler, 4500);
      }
      return setTimeout(handler, 4500);
    };
    const timeoutId = schedule(() => {
      setStatusToasts((prev) => prev.filter((toast) => toast.id !== toastId));
      statusToastTimersRef.current.delete(toastId);
    });
    statusToastTimersRef.current.set(toastId, timeoutId);
  }, []);

  useEffect(() => () => {
    if (statusToastTimersRef.current.size > 0) {
      statusToastTimersRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      statusToastTimersRef.current.clear();
    }
  }, []);

  useEffect(() => () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  const renderEditFormBody = () => (
    <div className="form-fields editor-simple">
      <div className="form-field">
        <label className="form-label" htmlFor="edit-title">Title</label>
        {editingLastTask ? (
          <textarea
            id="edit-title"
            className="input-field input-field--title textarea-grow"
            ref={editTitleRef}
            rows={1}
            value={editFields.title}
            onChange={(event) => handleEditFieldChange("title", event.target.value)}
            placeholder="Task title"
            autoFocus
          />
        ) : (
          <input
            id="edit-title"
            className="input-field input-field--title"
            value={editFields.title}
            onChange={(event) => handleEditFieldChange("title", event.target.value)}
            placeholder="Task title"
            autoFocus
          />
        )}
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="edit-description">Description</label>
        <textarea
          id="edit-description"
          className="input-field textarea-grow textarea-grow--description"
          ref={editDescriptionRef}
          rows={1}
          value={editFields.description}
          onChange={(event) => handleEditFieldChange("description", event.target.value)}
          placeholder="Task details"
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="edit-date">Due date</label>
        <input
          id="edit-date"
          className="input-field"
          type="date"
          min={minDate}
          value={editFields.date}
          aria-invalid={Boolean(editDateError)}
          onChange={(event) => {
            const value = event.target.value;
            handleEditFieldChange("date", value);
            if (editDateError) {
              validateEditDateField(value);
            }
          }}
          onBlur={() => validateEditDateField(editFields.date)}
        />
        {editDateError && <p className="form-error">{editDateError}</p>}
      </div>
      <div className="time-inline" role="group" aria-label="Due time">
        <div className="time-inline__field">
          <label className="form-label" htmlFor="edit-hour">Hour</label>
          <input
            id="edit-hour"
            className="input-field"
            type="number"
            min="1"
            max="12"
            placeholder="01"
            value={editFields.hour}
            aria-invalid={Boolean(editTimeError)}
            onChange={(event) => handleEditFieldChange("hour", event.target.value)}
          />
        </div>
        <div className="time-inline__field">
          <label className="form-label" htmlFor="edit-minute">Minutes</label>
          <input
            id="edit-minute"
            className="input-field"
            type="number"
            min="0"
            max="59"
            placeholder="00"
            value={editFields.minute}
            aria-invalid={Boolean(editTimeError)}
            onChange={(event) => handleEditFieldChange("minute", event.target.value)}
          />
        </div>
        <div className="time-inline__field">
          <label className="form-label" htmlFor="edit-period">AM/PM</label>
          <select
            id="edit-period"
            className="input-field select-field"
            value={editFields.period}
            aria-invalid={Boolean(editTimeError)}
            onChange={(event) => handleEditFieldChange("period", event.target.value)}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
      {editTimeError && <p className="form-error">{editTimeError}</p>}
      <div className="form-field form-field--status">
        <label className="form-label" htmlFor="edit-status">Status</label>
        <select
          id="edit-status"
          className="input-field select-field"
          value={editFields.status}
          onChange={(event) => handleEditFieldChange("status", event.target.value)}
        >
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor="edit-priority">Priority</label>
        <select
          id="edit-priority"
          className="input-field select-field"
          value={editFields.priority}
          onChange={(event) => handleEditFieldChange("priority", event.target.value)}
        >
          {priorityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const toggleTask = async (id) => {
    if (isMutating) return;
    const targetTask = tasks.find((task) => task.id === id);
    if (!targetTask || !user) {
      setMutationError(user ? "Task not found." : "You must be signed in to update tasks.");
      return;
    }
    const nextCompleted = !targetTask.completed;
    if (nextCompleted) {
      triggerTaskStatusToast("done");
    } else {
      triggerTaskStatusToast("active");
    }
    const optimisticSnapshot = { ...targetTask };
    updateTasks((prev) =>
      prev.map((task) => (task.id === targetTask.id ? { ...task, completed: nextCompleted } : task))
    );
    setIsMutating(true);
    setMutationError("");
    try {
      // SECURITY: Verify task ownership before updating
      // Both id AND user_id must match to prevent unauthorized modifications
      const { data, error } = await supabase
        .from("tasks")
        .update({ completed: nextCompleted })
        .eq("id", id)
        .eq("user_id", user.id)  // CRITICAL: Ensure task belongs to current user
        .select("*")
        .single();
      if (error) {
        setMutationError(error.message);
        updateTasks((prev) =>
          prev.map((task) => (task.id === optimisticSnapshot.id ? optimisticSnapshot : task))
        );
      } else if (data) {
        updateTasks((prev) => prev.map((task) => (task.id === data.id ? mapTaskRow(data) : task)));
      }
    } catch (error) {
      setMutationError(error.message ?? "Failed to update task");
      updateTasks((prev) =>
        prev.map((task) => (task.id === optimisticSnapshot.id ? optimisticSnapshot : task))
      );
    } finally {
      setIsMutating(false);
    }
  };

  const toggleTaskDetails = (taskId) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const toggleTaskMenu = (taskId) => {
    setMenuTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const handleMenuEdit = (task) => {
    closeTaskMenu();
    startEditTask(task);
  };

  const handleTaskRowClick = (taskId, event) => {
    if (isInteractiveTarget(event.target)) {
      return;
    }
    toggleTaskDetails(taskId);
  };

  const handleDeleteTask = async (taskId) => {
    if (isMutating) return;
    if (!user) {
      setMutationError("You must be signed in to delete tasks.");
      return;
    }
    
    // SECURITY: Verify task ownership before deletion
    // This ensures a user cannot delete another user's task
    setIsMutating(true);
    setMutationError("");
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("user_id", user.id);  // CRITICAL: Ensure task belongs to current user
      if (error) {
        setMutationError(error.message);
      } else {
        updateTasks((prev) => prev.filter((task) => task.id !== taskId));
        if (menuTaskId === taskId) {
          setMenuTaskId(null);
        }
        if (expandedTaskId === taskId) {
          setExpandedTaskId(null);
        }
        if (editTaskId === taskId) {
          setEditTaskId(null);
          setEditFields(emptyEditFields());
        }
      }
    } catch (error) {
      setMutationError(error.message ?? "Failed to delete task");
    } finally {
      setIsMutating(false);
    }
  };

  const startEditTask = (task) => {
    const parts = getDueDateParts(task.dueDate);
    setEditTaskId(task.id);
    setEditFields({
      title: task.title,
      description: task.description || "",
      date: parts.date,
      hour: parts.hour,
      minute: parts.minute,
      period: parts.period,
      status: task.completed ? "completed" : "active",
      priority: task.priority || "medium",
    });
    setEditDateError("");
    setEditTimeError("");
  };

  const saveEditTask = async (e) => {
    e.preventDefault();
    if (isMutating) return;
    const title = editFields.title.trim();
    if (!title) return;

    if (editFields.date) {
      const validation = validateDueDate(editFields.date);
      if (!validation.valid) {
        setEditDateError(validation.message);
        return;
      }
    } else {
      setEditDateError("");
    }
    setEditTimeError("");

    const dueDateIso = editFields.date
      ? buildDueDateIso(editFields.date, editFields.hour, editFields.minute, editFields.period)
      : null;
    const normalizedDescription = editFields.description.trim();
    const selectedPriority = editFields.priority || "medium";

    if (dueDateIso) {
      const dueDateObj = new Date(dueDateIso);
      if (!Number.isNaN(dueDateObj.getTime())) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfDue = new Date(dueDateObj);
        startOfDue.setHours(0, 0, 0, 0);
        const startOfTodayTs = startOfToday.getTime();
        const startOfDueTs = startOfDue.getTime();
        const dueTs = dueDateObj.getTime();
        const nowTs = Date.now();
        if (startOfDueTs < startOfTodayTs) {
          setEditDateError("Due date cannot be in the past");
          setEditTimeError("");
          return;
        }
        if (dueTs <= nowTs) {
          setEditDateError("");
          setEditTimeError("Due time cannot be in the past");
          return;
        }
      }
    }
    setEditDateError("");
    setEditTimeError("");

    let completed = editFields.status === "completed";
    const currentTask = tasks.find((task) => task.id === editTaskId) ?? null;
    if (!currentTask) {
      setMutationError("Task not found. Please refresh and try again.");
      closeEditOverlay();
      return;
    }
    const normalizedCurrentTitle = (currentTask.title ?? "").trim();
    const normalizedCurrentDescription = (currentTask.description ?? "").trim();
    let normalizedCurrentDueDate = currentTask.dueDate ?? null;
    if (normalizedCurrentDueDate) {
      const parsed = new Date(normalizedCurrentDueDate);
      if (!Number.isNaN(parsed.getTime())) {
        normalizedCurrentDueDate = parsed.toISOString();
      }
    }

    if (completed && didExtendDueDate(currentTask.dueDate, dueDateIso)) {
      completed = false;
    }

    const hasChanges =
      normalizedCurrentTitle !== title ||
      normalizedCurrentDescription !== normalizedDescription ||
      normalizedCurrentDueDate !== dueDateIso ||
      currentTask.completed !== completed ||
      currentTask.priority !== selectedPriority;

    if (!hasChanges) {
      closeEditOverlay();
      return;
    }

    if (!user) {
      setMutationError("You must be signed in to update tasks.");
      return;
    }

    const optimisticSnapshot = { ...currentTask };
    const updatedAt = new Date().toISOString();
    updateTasks((prev) =>
      prev.map((task) =>
        task.id === currentTask.id
          ? {
              ...task,
              title,
              description: normalizedDescription,
              dueDate: dueDateIso,
              completed,
              priority: selectedPriority,
              updated_at: updatedAt,
            }
          : task
      )
    );
    optimisticEditRef.current = { id: currentTask.id, snapshot: optimisticSnapshot };

    setIsMutating(true);
    setMutationError("");
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          title,
          description: normalizedDescription,
          due_date: dueDateIso,
          completed,
          priority: selectedPriority,
            updated_at: updatedAt,
        })
        .eq("id", editTaskId)
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error) {
        revertOptimisticEdit();
        setMutationError(error.message);
      } else if (data) {
        optimisticEditRef.current = null;
        updateTasks((prev) => prev.map((task) => (task.id === data.id ? mapTaskRow(data) : task)));
        closeEditOverlay();
        triggerTaskSavedToast("Task saved");
      }
    } catch (error) {
      revertOptimisticEdit();
      setMutationError(error.message ?? "Failed to update task");
    } finally {
      setIsMutating(false);
    }
  };

  const cancelEditTask = () => {
    closeEditOverlay();
  };

  const validateDateField = (value) => {
    const validation = validateDueDate(value);
    setDateError(validation.valid ? "" : validation.message);
    return validation.valid;
  };

  const validateTimeFields = useCallback((hourValue, minuteValue) => {
    if (!hourValue?.trim() || !minuteValue?.trim()) {
      setTimeError("Please enter a due time");
      return false;
    }

    const hour = Number(hourValue);
    if (!Number.isFinite(hour) || hour < 1 || hour > 12) {
      setTimeError("Hour must be between 1 and 12");
      return false;
    }

    const minute = Number(minuteValue);
    if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
      setTimeError("Minutes must be between 0 and 59");
      return false;
    }

    setTimeError("");
    return true;
  }, []);

  const handleAddTask = async (e) => {
    e?.preventDefault?.();
    if (isMutating) return;
    const title = newTaskTitle.trim();
    if (!title) return;
    if (!validateDateField(newTaskDate)) return;
    if (!validateTimeFields(newTaskHour, newTaskMinute)) return;
    if (!user) {
      setMutationError("You must be signed in to add tasks.");
      return;
    }

    const dueDateIso = buildDueDateIso(newTaskDate, newTaskHour, newTaskMinute, newTaskPeriod);
    if (dueDateIso) {
      const dueDateObj = new Date(dueDateIso);
      if (!Number.isNaN(dueDateObj.getTime())) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfDue = new Date(dueDateObj);
        startOfDue.setHours(0, 0, 0, 0);
        const startOfTodayTs = startOfToday.getTime();
        const startOfDueTs = startOfDue.getTime();
        const dueTs = dueDateObj.getTime();
        const nowTs = Date.now();
        if (startOfDueTs < startOfTodayTs) {
          setDateError("Due date cannot be in the past");
          setTimeError("");
          return;
        }
        if (startOfDueTs === startOfTodayTs && dueTs <= nowTs) {
          setDateError("");
          setTimeError("Due time cannot be in the past");
          return;
        }
        if (dueTs <= nowTs) {
          setDateError("");
          setTimeError("Due time cannot be in the past");
          return;
        }
      }
    }
    setDateError("");
    setTimeError("");
    setIsMutating(true);
    setMutationError("");
    try {
      // SECURITY: Always set user_id to currently authenticated user
      // This ensures tasks can ONLY be created for the logged-in user
      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            user_id: user.id,  // CRITICAL: Bind task to current user
            title,
            description: newTaskDescription.trim(),
            due_date: dueDateIso,
            completed: false,
            priority: newTaskPriority,
          },
        ])
        .select("*")
        .single();
      if (error) {
        setMutationError(error.message);
        } else if (data) {
          updateTasks((prev) => [...prev, mapTaskRow(data)]);
          dismissComposer();
          triggerTaskSavedToast();
        }
    } catch (error) {
      setMutationError(error.message ?? "Failed to add task");
    } finally {
      setIsMutating(false);
    }
  };

  const isSaveDisabled =
    !newTaskTitle.trim() ||
    !newTaskDate ||
    !newTaskHour.trim() ||
    !newTaskMinute.trim() ||
    Boolean(dateError) ||
    Boolean(timeError);

  const handleNewTaskTitleChange = (value) => {
    setNewTaskTitle(value);
    autoResizeTextarea(newTaskTitleRef.current);
  };

  const handleNewTaskDescriptionChange = (value) => {
    setNewTaskDescription(value);
    autoResizeTextarea(newTaskDescriptionRef.current);
  };

  const handleNewTaskHourChange = (value) => {
    setNewTaskHour(value);
    if (timeError) {
      validateTimeFields(value, newTaskMinute);
    }
  };

  const handleNewTaskMinuteChange = (value) => {
    setNewTaskMinute(value);
    if (timeError) {
      validateTimeFields(newTaskHour, value);
    }
  };

  const handleEditFieldChange = (field, value) => {
    setEditFields((prev) => ({ ...prev, [field]: value }));

    if (field === "date") {
      setEditDateError("");
    }
    if (field === "hour" || field === "minute" || field === "period") {
      setEditTimeError("");
    }

    if (field === "title" && editTitleRef.current) {
      autoResizeTextarea(editTitleRef.current);
    } else if (field === "description" && editDescriptionRef.current) {
      autoResizeTextarea(editDescriptionRef.current);
    }
  };

  const validateEditDateField = (value) => {
    if (!value) {
      setEditDateError("");
      return true;
    }
    const validation = validateDueDate(value);
    setEditDateError(validation.valid ? "" : validation.message);
    return validation.valid;
  };

  return (
    <>
      {composerOpen && (
        <div
          className="composer-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Add task form"
          onClick={handleOverlayDismiss}
        >
          <form
            className="tasks-card__form composer composer-depth composer-float"
            onSubmit={handleAddTask}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="composer-close"
              aria-label="Close add task form"
              onClick={handleOverlayDismiss}
              disabled={disableMutations}
            >
              ×
            </button>

            <div className="form-fields">
              <div className="form-field">
                <label className="form-label" htmlFor="task-title">Title</label>
                <textarea
                  id="task-title"
                  className="input-field input-field--title textarea-grow"
                  ref={newTaskTitleRef}
                  rows={2}
                  value={newTaskTitle}
                  onChange={(event) => handleNewTaskTitleChange(event.target.value)}
                  placeholder="Task title"
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="task-description">Description</label>
                <textarea
                  id="task-description"
                  className="input-field textarea-grow textarea-grow--description"
                  ref={newTaskDescriptionRef}
                  value={newTaskDescription}
                  onChange={(event) => handleNewTaskDescriptionChange(event.target.value)}
                  placeholder="Describe the work"
                  rows={1}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="task-date">Due date</label>
                <input
                  id="task-date"
                  className="input-field"
                  type="date"
                  required
                  min={minDate}
                  value={newTaskDate}
                  aria-invalid={Boolean(dateError)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setNewTaskDate(value);
                    if (dateError) {
                      validateDateField(value);
                    }
                  }}
                  onBlur={() => validateDateField(newTaskDate)}
                />
                {dateError && <p className="form-error">{dateError}</p>}
              </div>

              <div className="time-inline" role="group" aria-label="Due time">
                <div className="time-inline__field">
                  <label className="form-label" htmlFor="task-hour">Hour</label>
                  <input
                    id="task-hour"
                    className="input-field"
                    type="number"
                    min="1"
                    max="12"
                      required
                      aria-invalid={Boolean(timeError)}
                    placeholder="01"
                    value={newTaskHour}
                      onChange={(event) => handleNewTaskHourChange(event.target.value)}
                      onBlur={() => validateTimeFields(newTaskHour, newTaskMinute)}
                  />
                </div>
                <div className="time-inline__field">
                  <label className="form-label" htmlFor="task-minute">Minutes</label>
                  <input
                    id="task-minute"
                    className="input-field"
                    type="number"
                    min="0"
                    max="59"
                      required
                      aria-invalid={Boolean(timeError)}
                    placeholder="00"
                    value={newTaskMinute}
                      onChange={(event) => handleNewTaskMinuteChange(event.target.value)}
                      onBlur={() => validateTimeFields(newTaskHour, newTaskMinute)}
                  />
                </div>
                <div className="time-inline__field">
                  <label className="form-label" htmlFor="task-period">AM/PM</label>
                  <select
                    id="task-period"
                    className="input-field select-field"
                      required
                    value={newTaskPeriod}
                    onChange={(event) => setNewTaskPeriod(event.target.value)}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
                {timeError && <p className="form-error">{timeError}</p>}

              <div className="form-field">
                <label className="form-label" htmlFor="task-priority">Priority</label>
                <select
                  id="task-priority"
                  className="input-field select-field"
                  value={newTaskPriority}
                  onChange={(event) => setNewTaskPriority(event.target.value)}
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="composer-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={dismissComposer}
                disabled={disableMutations}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={isSaveDisabled || disableMutations}
              >
                Save
              </button>
            </div>
          </form>

        </div>
      )}

      {editTaskId && (
        <div
          className="composer-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Edit task"
          onClick={handleEditOverlayDismiss}
        >
          <form
            className="tasks-card__form composer composer-depth composer-float"
            onSubmit={saveEditTask}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="composer-close"
              aria-label="Close edit task form"
              onClick={handleEditOverlayDismiss}
              disabled={disableMutations}
            >
              ×
            </button>
            {renderEditFormBody()}
            <div className="composer-actions editor-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={cancelEditTask}
                disabled={disableMutations}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={isMutating}
              >
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}

      {activeMenuTask && (
        <div
          className="task-menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Task options"
          onClick={closeTaskMenu}
        >
          <div
            className="task-menu-float"
            role="menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-menu-float__header">
              <div>
                <p className="eyebrow-label">Task options</p>
                <h4>{activeMenuTask.title}</h4>
              </div>
              <button
                type="button"
                className="task-menu-close"
                aria-label="Close task menu"
                onClick={closeTaskMenu}
              >
                ×
              </button>
            </div>
            <div className="task-menu-float__actions">
              <button
                type="button"
                role="menuitem"
                className="task-menu-action"
                onClick={() => handleMenuEdit(activeMenuTask)}
              >
                Edit task
              </button>
              <button
                type="button"
                role="menuitem"
                className="task-menu-action task-menu-action--danger"
                onClick={() => handleDeleteTask(activeMenuTask.id)}
                disabled={disableMutations}
              >
                Delete task
              </button>
            </div>
          </div>
        </div>
      )}

        {showTaskAdded && (
          <div className="task-saved-toast" aria-live="assertive" role="status">
            <div className="task-saved-toast__icon">✓</div>
            <p>{taskToastMessage}</p>
          </div>
        )}

      <section className="tasks-card">
        <header className="tasks-card__header">
          <div>
            <p className="eyebrow-label">Priority queue</p>
            <h2>My Tasks</h2>
            <p className="muted">{completedCount} completed · {tasks.length} total</p>
          </div>
        </header>

        <section className="tasks-card__metrics">
          <article className="metric-tile">
            <p className="metric-label">Active</p>
            <p className="metric-value">{activeCount}</p>
            <span className="metric-hint">Need attention</span>
          </article>
          <article className="metric-tile">
            <p className="metric-label">Completed</p>
            <p className="metric-value">{completedCount}</p>
            <span className="metric-hint">Wrapped up</span>
          </article>
        </section>

        {(isFetchingTasks || isMutating) && (
          <div className="tasks-sync" role="status">
            {isFetchingTasks ? "Loading tasks…" : "Syncing changes…"}
          </div>
        )}
        {(fetchError || mutationError) && (
          <div className="tasks-sync tasks-sync--error" role="alert">
            <span>{fetchError || mutationError}</span>
            {onRefreshTasks && !isFetchingTasks && (
              <button type="button" className="tasks-sync__retry" onClick={onRefreshTasks}>
                Retry
              </button>
            )}
          </div>
        )}

        {!composerOpen && (
          <button
            type="button"
            className="primary-btn add-trigger"
            onClick={() => setComposerOpen(true)}
          >
            Add task
          </button>
        )}

        <div className="tasks-card__toolbar">
          <div className="search-field">
            <input
              className="input-field"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
            />
          </div>
          <div className="chip-group">
            <FilterButton label="All" active={filter === "all"} onClick={() => setFilter("all")} />
            <FilterButton label="Active" active={filter === "active"} onClick={() => setFilter("active")} />
            <FilterButton label="Completed" active={filter === "completed"} onClick={() => setFilter("completed")} />
            <button
              type="button"
              className={`chip${showPriorityMeta ? " is-active" : ""}`}
              onClick={() => setShowPriorityMeta((prev) => !prev)}
              aria-pressed={showPriorityMeta}
            >
              {showPriorityMeta ? "Hide priority" : "Show priority"}
            </button>
          </div>
        </div>

      <ul className="tasks-list">
        {visibleTasks.length === 0 && (
          <li className="tasks-list__empty">No tasks match your filters.</li>
        )}

        {visibleTasks.map((task) => {
          const isOverdueTask = !task.completed && isCountdownOverdue(task.dueDate, now);
          const dueEcho = formatDueInputEcho(task.dueDate);
          const checkboxId = `task-${task.id}-toggle`;
          const countdownLabel = task.completed ? "Completed" : formatCountdown(task.dueDate, now);
          const isExpanded = expandedTaskId === task.id;
          const detailDescription = task.description?.trim() ? task.description : "No description provided.";
          const detailPriorityLabel = task.priority
            ? `${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1)} priority`
            : "Priority not set";
          const detailTimeLabel = dueEcho.timeLabel || "—";
          let detailDateLabel = "No due date";
          if (task.dueDate) {
            const detailDate = new Date(task.dueDate);
            if (!Number.isNaN(detailDate.getTime())) {
              detailDateLabel = detailDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              });
            }
          }
          return (
            <li key={task.id} className={`tasks-list__item${isExpanded ? " is-expanded" : ""}`}>
              <button
                type="button"
                className="task-menu-trigger"
                aria-label="Task options"
                aria-haspopup="menu"
                aria-expanded={menuTaskId === task.id}
                onClick={() => toggleTaskMenu(task.id)}
              >
                <span />
                <span />
                <span />
              </button>
              <div className="task-row" onClick={(event) => handleTaskRowClick(task.id, event)}>
                <div className="task-row__primary">
                  <div className="task-toggle" role="group" aria-label="Task completion">
                    <button
                      type="button"
                      id={checkboxId}
                      className={`task-checkbox-button${task.completed ? " is-checked" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleTask(task.id);
                      }}
                      disabled={disableMutations}
                      aria-pressed={task.completed}
                      aria-label={task.completed ? "Mark task as active" : "Mark task as completed"}
                    >
                      <span className="task-checkbox-button__icon" aria-hidden="true" />
                    </button>
                    <span className={`task-title${task.completed ? " is-complete" : ""}`}>
                      {task.title || "Untitled task"}
                    </span>
                  </div>
                  {!isExpanded && (
                    <div className="task-row__meta">
                      <span
                        className={`task-due${dueEcho.dateLabel ? "" : " is-empty"}`}
                        aria-label={dueEcho.dateLabel ? "Due date" : "No due date"}
                      >
                        {dueEcho.dateLabel || "No due date"}
                      </span>
                      <span
                        className={`task-due${dueEcho.timeLabel ? "" : " is-empty"}`}
                        aria-label={dueEcho.timeLabel ? "Due time" : "No due time"}
                      >
                        {dueEcho.timeLabel || "No due time"}
                      </span>
                      <span
                        className={`task-countdown${isOverdueTask ? " is-overdue" : ""}`}
                        aria-label={task.completed ? "Task completed" : "Time remaining"}
                      >
                        {countdownLabel}
                      </span>
                      {showPriorityMeta && (
                        <span className={`priority-chip priority-${task.priority || "medium"}`}>
                          {task.priority ?? "medium"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && editTaskId !== task.id && (
                <div className="task-detail-panel" onClick={(event) => event.stopPropagation()}>
                  <p className="task-detail-panel__label">Details</p>
                  <p className="task-detail-panel__description">{detailDescription}</p>
                  <div className="task-detail-panel__meta">
                    <div className="task-detail-panel__meta-item">
                      <span className="task-detail-panel__meta-label">Due:</span>
                      <span>{detailDateLabel}</span>
                    </div>
                    <div className="task-detail-panel__meta-item">
                      <span className="task-detail-panel__meta-label">Time:</span>
                      <span>{detailTimeLabel}</span>
                    </div>
                    <div className="task-detail-panel__meta-item">
                      <span className="task-detail-panel__meta-label">Priority:</span>
                      <span>{detailPriorityLabel}</span>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {menuTaskId && activeMenuTask && (
        <ul className="task-menu" role="menu" aria-label="Task actions">
          <li>
            <button type="button" role="menuitem" onClick={() => handleMenuEdit(activeMenuTask)}>
              Edit
            </button>
          </li>
          <li>
            <button type="button" role="menuitem" onClick={() => handleDeleteTask(activeMenuTask.id)}>
              Delete
            </button>
          </li>
        </ul>
      )}
    </section>
      {statusToasts.length > 0 && (
        <div className="task-floating-toast-stack" aria-live="assertive">
          {statusToasts.map((toast) => {
            const variant = toast.variant === "active" ? "active" : "done";
            return (
              <div
                key={toast.id}
                className={`task-floating-toast task-floating-toast--${variant}`}
                role="status"
              >
                <div className={`task-floating-toast__icon task-floating-toast__icon--${variant}`}>
                  {variant === "active" ? "↺" : "✓"}
                </div>
                <span>{variant === "active" ? "Task now Active" : "Marked done"}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function emptyEditFields() {
  return {
    title: "",
    description: "",
    date: "",
    hour: "",
    minute: "",
    period: "AM",
    status: "active",
    priority: "medium",
  };
}

function FilterButton({ label, active, onClick }) {
  return (
    <button type="button" className={`chip${active ? " is-active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

const INTERACTIVE_ROW_SELECTOR = "button, input, textarea, select, label, a, [role='button'], [role='menuitem'], .task-menu-trigger, .task-detail-card__dots";
const COUNTDOWN_OVERDUE_GRACE_MS = 10000; // buffer to avoid flickering overdue state for near-term edits
const DAY_IN_MS = 86400000;
const TWO_DAYS_IN_MS = DAY_IN_MS * 2;

function isInteractiveTarget(target) {
  let node = target instanceof Element ? target : target?.parentElement ?? null;
  if (!node) {
    return false;
  }
  return Boolean(node.closest(INTERACTIVE_ROW_SELECTOR));
}

function isCountdownOverdue(dueDate, nowTs) {
  if (!dueDate) return false;
  const value = new Date(dueDate);
  if (Number.isNaN(value.getTime())) return false;
  return value.getTime() + COUNTDOWN_OVERDUE_GRACE_MS < nowTs;
}

function shouldAutoElevatePriority(dueDate, nowTs) {
  if (!dueDate) return false;
  const value = new Date(dueDate);
  if (Number.isNaN(value.getTime())) return false;
  const diff = value.getTime() - nowTs;
  if (diff <= 0) {
    return true;
  }
  return diff <= DAY_IN_MS;
}

function shouldAutoPromoteToMedium(dueDate, nowTs) {
  if (!dueDate) return false;
  const value = new Date(dueDate);
  if (Number.isNaN(value.getTime())) return false;
  const diff = value.getTime() - nowTs;
  return diff > DAY_IN_MS && diff <= TWO_DAYS_IN_MS;
}

function didExtendDueDate(previousDueDate, nextDueDate) {
  if (!previousDueDate || !nextDueDate) {
    return false;
  }
  const prev = new Date(previousDueDate);
  const next = new Date(nextDueDate);
  if (Number.isNaN(prev.getTime()) || Number.isNaN(next.getTime())) {
    return false;
  }
  return next.getTime() > prev.getTime();
}

const priorityOptions = ["high", "medium", "low"];

function mapTaskRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    dueDate: normalizeDueDateValue(row.due_date),
    completed: row.completed ?? false,
    priority: row.priority ?? "medium",
  };
}

function normalizeDueDateValue(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const normalizedString = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
    const date = new Date(normalizedString);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function getDueDateParts(value) {
  if (!value) {
    return { date: "", hour: "", minute: "", period: "AM" };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: "", hour: "", minute: "", period: "AM" };
  }
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const hours = date.getHours();
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return {
    date: isoDate,
    hour: String(hour12).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
    period,
  };
}

function buildDueDateIso(dateInput, hourInput, minuteInput, periodInput) {
  if (!dateInput) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return null;
  return buildUtcDate({ date: dateInput, hour: hourInput, minute: minuteInput, period: periodInput });
}

function buildUtcDate({ date, hour, minute, period }) {
  if (!date) return null;
  let h = Number(hour);
  if (!Number.isFinite(h)) {
    return null;
  }

  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;

  const minuteValue = Number(minute);
  if (!Number.isFinite(minuteValue)) {
    return null;
  }
  const minuteString = String(minuteValue).padStart(2, "0");
  const hourString = String(h).padStart(2, "0");
  const localDate = new Date(`${date}T${hourString}:${minuteString}:00`);

  return Number.isNaN(localDate.getTime()) ? null : localDate.toISOString();
}

function formatCountdown(dueDate, nowTs) {
  if (!dueDate) return "No due date";
  const value = new Date(dueDate);
  if (Number.isNaN(value.getTime())) return "No due date";
  const diff = value.getTime() - nowTs;
  if (diff === 0) return "Due now";

  if (diff < 0 && Math.abs(diff) <= COUNTDOWN_OVERDUE_GRACE_MS) {
    return "Due now";
  }

  const totalSeconds = Math.floor(Math.abs(diff) / 1000);
  const formatted = formatDuration(totalSeconds);

  if (diff > 0) {
    return formatted;
  }
  return `Overdue ${formatted}`;
}

function formatDuration(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatDueInputEcho(isoString) {
  if (!isoString) {
    return { dateLabel: "", timeLabel: "" };
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: "", timeLabel: "" };
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  const rawHours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = rawHours >= 12 ? "PM" : "AM";
  const hour12 = rawHours % 12 || 12;
  return {
    dateLabel: `${month}/${day}/${year}`,
    timeLabel: `${hour12}:${minutes} ${period}`,
  };
}

function validateDueDate(dateString) {
  if (!dateString) return { valid: false, message: "Please select a due date" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return { valid: false, message: "Enter a valid date (YYYY-MM-DD)" };
  }
  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return { valid: false, message: "Year must be between 1900 and 2100" };
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return { valid: false, message: "Enter a valid month" };
  }
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return { valid: false, message: "Enter a valid day" };
  }
  const candidate = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(candidate.getTime())) {
    return { valid: false, message: "Enter a real calendar date" };
  }
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() + 1 !== month ||
    candidate.getDate() !== day
  ) {
    return { valid: false, message: "Enter a real calendar date" };
  }
  candidate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (candidate < today) {
    return { valid: false, message: "Due date cannot be in the past" };
  }
  return { valid: true, message: "" };
}
