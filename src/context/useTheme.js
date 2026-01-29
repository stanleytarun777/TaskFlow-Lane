/**
 * useTheme.js - Theme Hook
 * 
 * Custom hook to consume theme context in any component.
 * 
 * Returns object with:
 * - theme: Current theme object { id, label, tokens }
 * - setTheme: Function to change theme
 * 
 * Usage in a component:
 * ```
 * const { theme, setTheme } = useTheme();
 * setTheme('aurora-midnight'); // Changes to new theme
 * ```
 * 
 * Must be used inside a <ThemeProvider> wrapper.
 */

import { useContext } from "react";
import { ThemeContext } from "./ThemeContextState";

/**
 * useTheme - Hook to access theme context
 * 
 * @returns {Object} Theme context with current theme and setTheme function
 * @throws {Error} If used outside of ThemeProvider
 */
export function useTheme() {
  return useContext(ThemeContext);
}
