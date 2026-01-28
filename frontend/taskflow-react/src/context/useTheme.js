import { useContext } from "react";
import { ThemeContext } from "./ThemeContextState";

export function useTheme() {
  return useContext(ThemeContext);
}
