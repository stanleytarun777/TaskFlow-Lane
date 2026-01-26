import { createContext } from "react";
import { DEFAULT_THEME_ID, themes } from "../themes";

export const ThemeContext = createContext({
  themeId: DEFAULT_THEME_ID,
  theme: themes[0],
  themes,
  setTheme: () => {},
});
