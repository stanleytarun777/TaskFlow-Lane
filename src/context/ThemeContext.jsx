/**
 * ThemeContext.jsx - Theme Provider Component
 * 
 * This context manages the global theme state for the entire application.
 * 
 * Features:
 * - Loads theme preference from localStorage
 * - Applies theme CSS variables to document root
 * - Provides theme switching functionality
 * - Validates theme IDs against available themes
 * - Persists theme selection across sessions
 * 
 * Used with useTheme() hook to access theme in components.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME_ID, themes } from "../themes";
import { supabase } from "../supabase";
import { ThemeContext } from "./ThemeContextState";

/**
 * THEME_TOKEN_KEYS - Array of all CSS variable keys used across themes
 * 
 * Collects unique keys from all theme definitions (--page-bg, --text-primary, etc.)
 * Used to apply CSS variables to document root when theme changes.
 */
const THEME_TOKEN_KEYS = Array.from(
	new Set(
		themes.flatMap((entry) => Object.keys(entry.tokens))
	)
);

// LocalStorage key for persisting theme preference
const STORAGE_KEY = "taskflow-theme";

// Theme to use on login page (accessible to non-authenticated users)
const LOGIN_THEME_ID = themes.some((entry) => entry.id === "contrast") ? "contrast" : DEFAULT_THEME_ID;

/**
 * resolveThemeId - Validates theme ID exists, returns default if not
 * 
 * @param {string} candidate - Theme ID to validate
 * @returns {string} Valid theme ID
 */
const resolveThemeId = (candidate) => {
	if (!candidate) {
		return DEFAULT_THEME_ID;
	}
	const exists = themes.some((theme) => theme.id === candidate);
	return exists ? candidate : DEFAULT_THEME_ID;
};

/**
 * getInitialThemeId - Loads theme from localStorage or returns default
 * 
 * On app startup, check if user previously selected a theme.
 * If valid theme stored, use it. Otherwise use default.
 * 
 * @returns {string} Theme ID to use on mount
 */
const getInitialThemeId = () => {
	if (typeof window === "undefined") {
		return DEFAULT_THEME_ID;
	}
	const stored = window.localStorage.getItem(STORAGE_KEY);
	const exists = themes.some((theme) => theme.id === stored);
	return exists ? stored : DEFAULT_THEME_ID;
};

/**
 * ThemeProvider - Context provider component
 * 
 * Wraps entire app to provide theme context.
 * Manages:
 * - Current theme state
 * - Authentication status
 * - CSS variable application
 * - Theme persistence
 * 
 * Usage: Wrap <App /> with <ThemeProvider>
 * Then use useTheme() hook in any component to access theme.
 */
export function ThemeProvider({ children }) {
	// Current selected theme ID (from localStorage or default)
	const [preferredThemeId, setPreferredThemeId] = useState(getInitialThemeId);
	
	// Track if user is authenticated (determines which theme applies)
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	// Monitor authentication status
	useEffect(() => {
		let isMounted = true;
		supabase.auth.getSession().then(({ data }) => {
			if (isMounted) {
				setIsAuthenticated(Boolean(data?.session));
			}
		});
		const { data } = supabase.auth.onAuthStateChange((_event, session) => {
			if (isMounted) {
				setIsAuthenticated(Boolean(session));
			}
		});
		return () => {
			isMounted = false;
			data?.subscription?.unsubscribe();
		};
	}, []);

	const resolvedThemeId = isAuthenticated ? preferredThemeId : LOGIN_THEME_ID;
	const activeThemeId = useMemo(() => resolveThemeId(resolvedThemeId), [resolvedThemeId]);

	const theme = useMemo(() => {
		return themes.find((entry) => entry.id === activeThemeId) ?? themes.find((entry) => entry.id === DEFAULT_THEME_ID);
	}, [activeThemeId]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return undefined;
		}
		window.localStorage.setItem(STORAGE_KEY, preferredThemeId);
		return undefined;
	}, [preferredThemeId]);

	useEffect(() => {
		if (typeof window === "undefined" || !theme) {
			return undefined;
		}

		const root = document.documentElement;
		root.setAttribute("data-theme", theme.id);
		THEME_TOKEN_KEYS.forEach((token) => {
			const value = theme.tokens[token];
			if (value === undefined || value === null) {
				root.style.removeProperty(token);
				return;
			}
			root.style.setProperty(token, value);
		});
		return undefined;
	}, [theme]);

	const setTheme = useCallback((nextId) => {
		setPreferredThemeId((currentId) => {
			if (!nextId || currentId === nextId) {
				return currentId;
			}
			const exists = themes.find((entry) => entry.id === nextId);
			return exists ? exists.id : currentId;
		});
	}, []);

	const value = useMemo(
		() => ({ themeId: activeThemeId, theme, themes, setTheme }),
		[activeThemeId, theme, setTheme]
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
