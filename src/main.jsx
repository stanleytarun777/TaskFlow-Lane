/**
 * main.jsx - Vite Entry Point
 * 
 * This file is the starting point for the React application.
 * It mounts the React tree to the DOM and wraps the entire app with:
 * - ThemeProvider: Provides theme context for global theme management
 * - App: Root component with routing
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";

// Mount React app to #root element in index.html
// ThemeProvider wraps App to enable theme switching across entire app
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);