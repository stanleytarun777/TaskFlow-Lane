import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME_ID, themes } from "../themes";
import { supabase } from "../supabase";
import { ThemeContext } from "./ThemeContextState";

const THEME_TOKEN_KEYS = Array.from(
	new Set(
		themes.flatMap((entry) => Object.keys(entry.tokens))
	)
);

const STORAGE_KEY = "taskflow-theme";
const LOGIN_THEME_ID = themes.some((entry) => entry.id === "contrast") ? "contrast" : DEFAULT_THEME_ID;

const resolveThemeId = (candidate) => {
	if (!candidate) {
		return DEFAULT_THEME_ID;
	}
	const exists = themes.some((theme) => theme.id === candidate);
	return exists ? candidate : DEFAULT_THEME_ID;
};

const getInitialThemeId = () => {
	if (typeof window === "undefined") {
		return DEFAULT_THEME_ID;
	}
	const stored = window.localStorage.getItem(STORAGE_KEY);
	const exists = themes.some((theme) => theme.id === stored);
	return exists ? stored : DEFAULT_THEME_ID;
};

export function ThemeProvider({ children }) {
	const [preferredThemeId, setPreferredThemeId] = useState(getInitialThemeId);
	const [isAuthenticated, setIsAuthenticated] = useState(false);

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
