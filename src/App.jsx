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
import ResetPassword from "./pages/reset-password";
import Sidebar from "./components/Sidebar";
import SiteFooter from "./components/SiteFooter";

function AppContent() {
  const [user, setUser] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");
  const userRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const hasHydratedSessionRef = useRef(false);
  const wasAuthenticatedRef = useRef(false);
  const locationSearch = location.search ?? "";
  const locationHash = location.hash ?? "";
  const isRecoveryLink = (locationSearch + locationHash).includes("type=recovery");
  const recoveryRedirectTarget = `/reset-password${locationSearch}${locationHash}`;

  const normalizeTask = useCallback((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    dueDate: row.due_date ?? null,
    completed: row.completed ?? false,
    priority: row.priority ?? "medium",
  }), []);

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
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,description,due_date,completed,priority")
        .eq("user_id", currentUser.id)
        .order("due_date", { ascending: true });

      if (error) {
        setTasks([]);
        setTasksError(error.message);
      } else {
        setTasks(sortTasks((data ?? []).map((row) => normalizeTask(row))));
      }
    } catch (error) {
      setTasks([]);
      setTasksError(error.message ?? "Failed to load tasks");
    } finally {
      setTasksLoading(false);
    }
  }, [normalizeTask, sortTasks]);

  const handleChildTasksChange = useCallback((nextValue) => {
    setTasks((prev) => {
      const resolved = typeof nextValue === "function" ? nextValue(prev) : nextValue;
      if (!Array.isArray(resolved)) {
        return prev;
      }
      return sortTasks(resolved);
    });
  }, [sortTasks]);

  const applyRealtimeChange = useCallback((payload) => {
    if (!payload) {
      return;
    }
    setTasks((current) => {
      if (payload.eventType === "DELETE" && payload.old?.id) {
        return current.filter((task) => task.id !== payload.old.id);
      }
      if (!payload.new) {
        return current;
      }
      const incoming = normalizeTask(payload.new);
      const existingIndex = current.findIndex((task) => task.id === incoming.id);
      if (existingIndex === -1) {
        return sortTasks([...current, incoming]);
      }
      const next = [...current];
      next[existingIndex] = incoming;
      return sortTasks(next);
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
      if (event === "PASSWORD_RECOVERY") {
        navigate(recoveryRedirectTarget, { replace: true });
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
        const onResetRoute = typeof window !== "undefined" && window.location.pathname === "/reset-password";
          const hasRecoveryHash = typeof window !== "undefined" && (window.location.hash + window.location.search).includes("type=recovery");
          if (hasRecoveryHash) {
            navigate(recoveryRedirectTarget, { replace: true });
            return;
          }
          if (!onResetRoute) {
          navigate("/", { replace: true });
        }
      }
      if (event === "SIGNED_OUT") {
        hasHydratedSessionRef.current = true;
      }
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, recoveryRedirectTarget]);

  useEffect(() => {
    fetchTasks(user);
  }, [user, fetchTasks]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }
    const channel = supabase
      .channel(`tasks-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        (payload) => applyRealtimeChange(payload)
      )
      .subscribe();

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
    if (!wasAuthenticated && isAuthenticated && !isRecoveryLink) {
      navigate("/", { replace: true });
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [user, navigate, isRecoveryLink]);

  if (isRecoveryLink && location.pathname !== "/reset-password") {
    return <Navigate to={recoveryRedirectTarget} replace />;
  }

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
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;