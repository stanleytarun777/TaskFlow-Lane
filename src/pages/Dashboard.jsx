import React, { useEffect } from "react";
import TasksFixed from "../components/TasksFixed";

function Dashboard({ user, tasks, onTasksChange, tasksLoading = false, tasksError = "", onRefreshTasks }) {
  const getFirstName = () => {
    const meta = user?.user_metadata ?? {};
    if (meta.first_name) {
      return meta.first_name.trim();
    }
    if (meta.full_name || meta.name) {
      const source = (meta.full_name || meta.name).trim();
      if (source) {
        return source.split(/\s+/)[0];
      }
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "Creator";
  };

  const displayName = getFirstName();

  // Track when tasks update and update sync state
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const syncState = {
      realtime: true,
      calendarAware: true,
      lastSync: new Date().toISOString(),
      taskCount: tasks.length,
      completedCount: tasks.filter((t) => t.completed).length,
    };
    window.__taskflowSync = syncState;
    const timer = setInterval(() => {
      syncState.lastSync = new Date().toISOString();
    }, 15000);
    return () => clearInterval(timer);
  }, [tasks]);

  return (
    <section className="dashboard">
      <div className="dashboard-hero glass-panel">
        <h1 className="dashboard-title">
          Hi, {displayName}
          <span className="gradient-text">.</span>
        </h1>
        <p className="dashboard-subtitle">
          Plan, prioritize, and execute with a unified workspace that keeps tasks and time perfectly aligned.
        </p>
      </div>

      <div className="dashboard-panels">
        <div className="panel-card panel-card--tasks">
          <TasksFixed
            user={user}
            tasks={tasks}
            onTasksChange={onTasksChange}
            isFetchingTasks={tasksLoading}
            fetchError={tasksError}
            onRefreshTasks={onRefreshTasks}
          />
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
