/**
 * App.jsx - Root Application Component
 * 
 * This is the main application file that handles:
 * 1. Authentication state management (user login/logout)
 * 2. Task data fetching from Supabase (filtered by user_id)
 * 3. Real-time task updates via subscriptions (filtered by user_id)
 * 4. Routing to different pages (Dashboard, Calendar, Stats, etc.)
 * 5. Mobile navigation state
 * 
 * CRITICAL SECURITY:
 * - All task queries filtered by user_id to ensure user isolation
 * - Real-time subscriptions scoped to current user only
 * - Tasks array contains ONLY current user's tasks
 * - Each user sees and can only modify their own data
 * 
 * Two main components:
 * - AppContent: Rendered when user is authenticated (shows dashboard, sidebar, etc.)
 * - App: Root router component that splits between Auth page and AppContent
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import Auth from "./auth/Auth";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import Stats from "./pages/Stats";
import ThemeSettings from "./pages/ThemeSettings";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

import Sidebar from "./components/Sidebar";
import SiteFooter from "./components/SiteFooter";

/**
 * AppContent Component
 * 
 * Rendered when user is authenticated. Contains:
 * - Sidebar navigation
 * - Main content area with routing
 * - Footer
 * - Task management logic
 * - Mobile navigation menu
 */
function AppContent() {
  // ===== STATE MANAGEMENT =====
  
  // User authentication state - holds current logged-in user data
  const [user, setUser] = useState(null);
  
  // Mobile menu toggle state - shows/hides navigation on mobile
  const [navOpen, setNavOpen] = useState(false);
  
  // Tasks array - stores all user's tasks
  const [tasks, setTasks] = useState([]);
  
  // Loading and error states for task fetching
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");
  
  // Refs for tracking authentication state across renders
  const userRef = useRef(null);
  const hasHydratedSessionRef = useRef(false);
  const wasAuthenticatedRef = useRef(false);
  
  // React Router hooks for navigation and location
  const location = useLocation();
  const navigate = useNavigate();
  


  /**
   * normalizeTask - Converts database task object to app format
   * 
   * Takes raw database row and transforms it with:
   * - Default values for missing fields
   * - Renamed properties (due_date -> dueDate)
   * - Type consistency
   * 
   * @param {Object} row - Database task row
   * @returns {Object} Normalized task object
   */
  const normalizeTask = useCallback((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    dueDate: row.due_date ?? null,
    completed: row.completed ?? false,
    priority: row.priority ?? "medium",
  }), []);

  /**
   * sortTasks - Sorts tasks by due date, then by title
   * 
   * Priority order:
   * 1. Tasks with due dates (sorted chronologically)
   * 2. Tasks without due dates (sorted alphabetically by title)
   * 
   * @param {Array} collection - Array of task objects
   * @returns {Array} Sorted task array
   */
  const sortTasks = useCallback((collection) => {
    return [...collection].sort((a, b) => {
      const aTime = a?.dueDate ? new Date(a.dueDate).getTime() : Number.NaN;
      const bTime = b?.dueDate ? new Date(b.dueDate).getTime() : Number.NaN;
      const aHasDate = Number.isFinite(aTime);
      const bHasDate = Number.isFinite(bTime);
      if (aHasDate && bHasDate) {
        if (aTime !== bTime) {
          return aTime - bTime;
        }
        return (a?.title ?? "").localeCompare(b?.title ?? "");
      }
      if (aHasDate) return -1;
      if (bHasDate) return 1;
      return (a?.title ?? "").localeCompare(b?.title ?? "");
    });
  }, []);

  /**
   * fetchTasks - Fetches ALL tasks for current user from Supabase
   * 
   * SECURITY: This query includes .eq("user_id", currentUser.id) filter
   * to ensure ONLY the logged-in user's tasks are retrieved from the database.
   * 
   * Handles:
   * - Loading state management
   * - Error handling
   * - Task normalization
   * - Task sorting
   * - User isolation (critical)
   * 
   * @param {Object} currentUser - Current authenticated user object (required)
   */
  const fetchTasks = useCallback(async (currentUser) => {
    if (!currentUser) {
      setTasks([]);
      setTasksLoading(false);
      setTasksError("");
      return;
    }

    setTasksLoading(true);
    setTasksError("");
    try {
      // SECURITY: Query Supabase for tasks belonging ONLY to current user
      // The .eq("user_id", currentUser.id) ensures isolation between users
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,description,due_date,completed,priority")
        .eq("user_id", currentUser.id)  // CRITICAL: Filter by user_id
        .order("due_date", { ascending: true });

      if (error) {
        setTasks([]);
        setTasksError(error.message);
      } else {
        // Normalize and sort tasks before storing
        setTasks(sortTasks((data ?? []).map((row) => normalizeTask(row))));
      }
    } catch (error) {
      setTasks([]);
      setTasksError(error.message ?? "Failed to load tasks");
    } finally {
      setTasksLoading(false);
    }
  }, [normalizeTask, sortTasks]);

  /**
   * handleChildTasksChange - Updates tasks state from child components
   * 
   * Called when TasksFixed component creates/updates/deletes tasks.
   * Re-sorts tasks after any change and ensures all pages (Stats, Calendar) receive updates.
   * 
   * @param {Array|Function} nextValue - New tasks array or function to compute it
   */
  const handleChildTasksChange = useCallback((nextValue) => {
    setTasks((prev) => {
      const resolved = typeof nextValue === "function" ? nextValue(prev) : nextValue;
      if (!Array.isArray(resolved)) {
        return prev;
      }
      const sorted = sortTasks(resolved);
      if (import.meta.env.MODE === "development") {
        console.log("[TaskFlow] Child component update:", sorted.length, "tasks");
      }
      return sorted;
    });
  }, [sortTasks]);

  /**
   * applyRealtimeChange - Processes real-time Supabase subscription updates
   * 
   * Handles three types of events:
   * - DELETE: Removes task from local state
   * - INSERT/UPDATE: Adds or updates task in local state
   * 
   * REAL-TIME INTEGRATION: This function ensures Stats, Calendar, and all pages
   * get immediate updates when tasks change via Supabase subscriptions.
   * 
   * @param {Object} payload - Supabase subscription event payload
   */
  const applyRealtimeChange = useCallback((payload) => {
    if (!payload) {
      return;
    }
    setTasks((current) => {
      if (payload.eventType === "DELETE" && payload.old?.id) {
        const updated = current.filter((task) => task.id !== payload.old.id);
        if (import.meta.env.MODE === "development") {
          console.log("[TaskFlow Real-Time] Task deleted:", payload.old.id, "Remaining:", updated.length);
        }
        return updated;
      }
      if (!payload.new) {
        return current;
      }
      const incoming = normalizeTask(payload.new);
      const existingIndex = current.findIndex((task) => task.id === incoming.id);
      if (existingIndex === -1) {
        const updated = sortTasks([...current, incoming]);
        if (import.meta.env.MODE === "development") {
          console.log("[TaskFlow Real-Time] Task inserted:", incoming.id);
        }
        return updated;
      }
      const old = current[existingIndex];
      const next = [...current];
      next[existingIndex] = incoming;
      const sorted = sortTasks(next);
      if (import.meta.env.MODE === "development" && old.completed !== incoming.completed) {
        console.log("[TaskFlow Real-Time] Task toggled:", incoming.id, "completed:", incoming.completed);
      }
      return sorted;
    });
  }, [normalizeTask, sortTasks]);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      const initialUser = data.session?.user ?? null;
      setUser(initialUser);
      userRef.current = initialUser;
      hasHydratedSessionRef.current = true;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }
      const nextUser = session?.user ?? null;
      const previousUser = userRef.current;
      setUser(nextUser);
      userRef.current = nextUser;
      if (event === "INITIAL_SESSION") {
        hasHydratedSessionRef.current = true;
        return;
      }
      if (event === "SIGNED_IN" && hasHydratedSessionRef.current && !previousUser && nextUser) {
        navigate("/", { replace: true });
      }
      if (event === "SIGNED_OUT") {
        hasHydratedSessionRef.current = true;
      }
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    fetchTasks(user);
  }, [user, fetchTasks]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }
    // SECURITY: Real-time subscription filtered by user_id
    // This channel listens ONLY to changes in tasks belonging to current user
    const channel = supabase
      .channel(`tasks-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (import.meta.env.MODE === "development") {
            console.log("[TaskFlow Real-Time] Event received:", payload.eventType);
          }
          applyRealtimeChange(payload);
        }
      )
      .subscribe((status) => {
        if (import.meta.env.MODE === "development") {
          console.log("[TaskFlow Real-Time] Channel status:", status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, applyRealtimeChange]);

  useEffect(() => {
    setNavOpen(false);
    if (typeof window !== "undefined") {
      const scrollToTop = () => {
        try {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        } catch {
          window.scrollTo(0, 0);
        }
      };

      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(scrollToTop);
      } else {
        scrollToTop();
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const wasAuthenticated = wasAuthenticatedRef.current;
    const isAuthenticated = Boolean(user);
    if (!wasAuthenticated && isAuthenticated) {
      navigate("/", { replace: true });
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [user, navigate]);

  if (!user) return <Auth />;

  const navLinks = [
    { to: "/", label: "Dashboard", exact: true, icon: "grid" },
    { to: "/calendar", label: "Calendar", icon: "calendar" },
    { to: "/stats", label: "Stats", icon: "chart" },
    { to: "/change-theme", label: "Change Theme", icon: "palette" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleNav = () => {
    setNavOpen((open) => !open);
  };

  const closeNav = () => {
    setNavOpen(false);
  };

  const handleMobileLogout = async () => {
    await handleLogout();
    closeNav();
  };

  return (
    <>
      <div
        className="site-branding site-branding--scroll"
        aria-label="TaskFlow portfolio brand"
      >
        <div className="site-branding__top">
          <div className="site-branding__name">
            <span>Task</span>
            <span className="site-branding__accent">Flow</span>
          </div>
          <button
            type="button"
            className="nav-toggle"
            aria-label="Toggle navigation"
            aria-haspopup="true"
            aria-controls="mobile-nav-menu"
            aria-expanded={navOpen}
            onClick={toggleNav}
          >
            <span className="nav-toggle__bar" />
            <span className="nav-toggle__bar" />
            <span className="nav-toggle__bar" />
          </button>
        </div>
        <p className="site-branding__subtitle">Plan, Prioritize, and Execute</p>
        <div
          className={`mobile-menu${navOpen ? " is-open" : ""}`}
          id="mobile-nav-menu"
          role="menu"
          aria-hidden={!navOpen}
        >
          <nav className="mobile-menu__nav">
            {navLinks.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) => `mobile-menu__link${isActive ? " is-active" : ""}`}
                onClick={closeNav}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <button type="button" className="mobile-menu__signout" onClick={handleMobileLogout}>
            Sign out
          </button>
        </div>
      </div>
      <div
        className={`mobile-menu__backdrop${navOpen ? " is-open" : ""}`}
        onClick={closeNav}
        aria-hidden="true"
      />
      <div className="app-shell app-shell--underlap">
        <Sidebar
          navLinks={navLinks}
          user={user}
          onLogout={handleLogout}
        />
        <div className="app-surface">
          <main className="app-main">
            <Routes>
              <Route
                path="/"
                element={(
                  <Dashboard
                    user={user}
                    tasks={tasks}
                    onTasksChange={handleChildTasksChange}
                    tasksLoading={tasksLoading}
                    tasksError={tasksError}
                    onRefreshTasks={() => fetchTasks(user)}
                  />
                )}
              />
              <Route path="/calendar" element={<CalendarPage tasks={tasks} />} />
              <Route path="/stats" element={<Stats tasks={tasks} />} />
              <Route path="/change-theme" element={<ThemeSettings />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
      <SiteFooter navLinks={navLinks} />
    </>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;