# TaskFlow Application - Complete Code Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Core Files](#core-files)
5. [Components](#components)
6. [Pages](#pages)
7. [Context & Themes](#context--themes)
8. [Utilities](#utilities)
9. [Configuration](#configuration)
10. [Authentication Flow](#authentication-flow)

---

## Project Overview

**TaskFlow** is a modern task management web application built with React 19 and Vite. It provides users with:
- Task creation, editing, and completion tracking
- Calendar view with day/month/year modes
- Statistics dashboard with completion metrics
- Customizable themes (12+ color schemes)
- Supabase-powered authentication
- Password reset functionality
- Mobile-responsive design

**Key Technologies:**
- **Frontend:** React 19, React Router 7, Vite 7
- **Backend:** Supabase (PostgreSQL + Auth)
- **Hosting:** Vercel
- **Styling:** Custom CSS with CSS variables for theming

---

## Architecture

### Data Flow
```
App (Router)
├── Auth (Unauthenticated users)
└── AppContent (Authenticated users)
    ├── Sidebar (Navigation)
    ├── Dashboard (Main tasks view)
    │   └── TasksFixed (Task list & management)
    ├── CalendarPage (Calendar view)
    ├── Stats (Analytics)
    ├── ThemeSettings (Appearance)
    ├── Terms & Privacy (Legal)
    └── SiteFooter (Footer)
```

### State Management
- **Local State:** React `useState` for component-level state
- **Authentication:** Supabase Auth (`supabase.auth.*`)
- **Database:** Supabase PostgreSQL (`supabase.from('tasks').*`)
- **Theme Context:** React Context API with localStorage persistence

### Real-time Updates
- **Supabase Subscriptions:** Real-time task updates via PostgreSQL triggers
- **Event Listeners:** `supabase.auth.onAuthStateChange()` for auth events

---

## File Structure

```
/Users/sebastianyana/WORKFLOW/
├── src/
│   ├── App.jsx                          # Root component & routing
│   ├── main.jsx                         # Vite entry point
│   ├── index.css                        # Global styles (4000+ lines)
│   ├── supabase.js                      # Supabase client initialization
│   ├── auth/
│   │   ├── Auth.jsx                     # Login/signup/forgot-password form
│   │   └── Auth.css                     # Auth styling
│   ├── components/
│   │   ├── Sidebar.jsx                  # Left navigation sidebar
│   │   ├── Calendar.jsx                 # Calendar component (day/month/year)
│   │   ├── TasksFixed.jsx               # Task list management (1600+ lines)
│   │   ├── SiteFooter.jsx               # Application footer
│   │   ├── Calendar.css
│   ├── pages/
│   │   ├── Dashboard.jsx                # Main dashboard page
│   │   ├── CalendarPage.jsx             # Calendar page wrapper
│   │   ├── Stats.jsx                    # Statistics & analytics
│   │   ├── ThemeSettings.jsx            # Theme picker
│   │   ├── Terms.jsx                    # Terms of Service
│   │   ├── Privacy.jsx                  # Privacy Policy
│   │   ├── reset-password.jsx           # Password reset form
│   │   └── reset-password.css
│   ├── context/
│   │   ├── ThemeContext.jsx             # Theme context provider
│   │   ├── ThemeContextState.js         # Theme state hook
│   │   └── useTheme.js                  # Theme consumption hook
│   ├── themes/
│   │   └── index.js                     # 12+ theme definitions
│   └── utils/
│       └── stats.js                     # Statistics calculation helpers
├── index.html                           # HTML entry point
├── package.json                         # Dependencies & scripts
├── vite.config.js                       # Vite configuration
├── eslint.config.js                     # ESLint rules
├── vercel.json                          # Vercel SPA rewrite rules
├── .gitignore                           # Git ignore patterns
└── README.md                            # Project README
```

---

## Core Files

### [src/main.jsx](src/main.jsx)
**Purpose:** Vite entry point that mounts React to the DOM

```jsx
// Wraps App with ThemeProvider for global theme context
// Initializes React Router
// Applies theme CSS variables to document root
```

### [src/App.jsx](src/App.jsx)
**Purpose:** Root component managing routing and core authentication logic

**Key Functions:**
- `AppContent()` - Main authenticated app with all pages and navigation
  - Manages user state via Supabase auth
  - Handles task fetching and real-time subscriptions
  - Provides sidebar navigation and main routing
  - Tracks recovery links for password reset
  
- `App()` - Top-level router wrapper
  - Splits routes: `/reset-password` (isolated) vs `/*` (authenticated app)

**Key State:**
```javascript
const [user, setUser] = useState(null);          // Current authenticated user
const [tasks, setTasks] = useState([]);          // User's tasks
const [tasksLoading, setTasksLoading] = useState(true);
const [tasksError, setTasksError] = useState("");
const [navOpen, setNavOpen] = useState(false);   // Mobile menu toggle
```

**Key Effects:**
- `useEffect(() => { supabase.auth.onAuthStateChange(...) })` - Monitors auth state
- `useEffect(() => { supabase.channel(...).subscribe() })` - Real-time task updates

### [src/supabase.js](src/supabase.js)
**Purpose:** Initializes and exports Supabase client

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**Usage:** Authentication, database queries, real-time subscriptions

### [src/index.css](src/index.css)
**Purpose:** 4000+ lines of global styles and theming

**Key Sections:**
- CSS Custom Properties for theming (--page-bg, --text-primary, --brand, etc.)
- Layout components (.site-branding, .sidebar, .app-main, etc.)
- Task styling (.task-item, .task-title, .task-completed, etc.)
- Calendar styling (.calendar, .calendar-month, .calendar-day, etc.)
- Form styling (.input, .button, .form-group, etc.)
- Responsive media queries for mobile (max-width: 640px)
- Dark mode support with @media (prefers-color-scheme: dark)

**Theme Variables Applied:**
All 12 themes (Aurora Default, Sunset, Ocean, etc.) define:
- Color scheme (dark/light)
- Background, surface, and border colors
- Brand and accent colors
- Text colors (primary, muted, inverse)
- Danger color for destructive actions

---

## Components

### [src/auth/Auth.jsx](src/auth/Auth.jsx)
**Purpose:** Login, signup, and forgot-password form for unauthenticated users

**Features:**
- Email/password login and signup
- Password strength validation
- Forgot password email sending
- Form validation with email regex patterns
- Toggle between login and signup modes

**Key Functions:**
- `handleLogin()` - Authenticates user via Supabase
- `handleSignup()` - Creates new user account and profile
- `handleResetPassword()` - Sends password reset email with recovery link
- `validateEmail()` - Checks email format
- `validatePassword()` - Checks password strength (8+ chars, mixed case, number/symbol)

**Props:** None (receives user context from parent)

### [src/components/Sidebar.jsx](src/components/Sidebar.jsx)
**Purpose:** Left-side navigation bar for authenticated users

**Features:**
- Navigation links (Dashboard, Calendar, Stats, Theme)
- User profile display with avatar
- Logout button
- Desktop and mobile responsive

**Props:**
```javascript
Sidebar({
  navLinks: [],        // Array of navigation links
  user: {},            // Current user object
  onLogout: Function   // Logout handler
})
```

### [src/components/Calendar.jsx](src/components/Calendar.jsx)
**Purpose:** Interactive calendar showing tasks on specific dates

**Features:**
- Three views: Day, Month, Year
- Navigate between dates
- "Today" button to jump to current date
- Task expansion to show details on specific day
- Color-coded task priorities

**Key Functions:**
- `renderDay()` - Shows tasks for a single day
- `renderMonth()` - Grid view of entire month with task indicators
- `renderYear()` - 12-month year view with completion stats
- `changeDay(delta)` - Navigate days
- `changeYear(delta)` - Navigate years
- `handleViewChange(nextView)` - Switch between day/month/year

**Props:**
```javascript
Calendar({
  tasks: [],                           // Array of task objects
  localTimes: {},                      // Task ID -> local time string mapping
  initialView: "month"                 // Starting view mode
})
```

### [src/components/TasksFixed.jsx](src/components/TasksFixed.jsx)
**Purpose:** Main task list component with create/edit/delete functionality (~1600 lines)

**Features:**
- Display tasks in priority order
- Create new tasks with title, description, due date
- Edit existing tasks inline
- Mark tasks complete/incomplete
- Delete tasks with confirmation
- Context menu (right-click) for bulk actions
- Task prioritization (Low, Medium, High)
- Toast notifications for actions

**Key State:**
```javascript
const [tasks, setTasks] = useState([]);          // Local task list
const [expandedTaskId, setExpandedTaskId] = useState(null);
const [activeMenuTask, setActiveMenuTask] = useState(null);
const [isCreatingTask, setIsCreatingTask] = useState(false);
const [showTaskAdded, setShowTaskAdded] = useState(false);
const [taskToastMessage, setTaskToastMessage] = useState("");
```

**Key Functions:**
- `handleCreateTask()` - Insert new task into Supabase
- `handleUpdateTask(taskId, updates)` - Update task fields
- `handleToggleComplete(taskId)` - Mark task complete/incomplete
- `handleDeleteTask(taskId)` - Delete task from database
- `getDueDateParts(value)` - Parse ISO date into date/time/period
- `formatDueDate(value)` - Format date for display

**Props:**
```javascript
TasksFixed({
  user: {},                            // Current user object
  tasks: [],                           // Array of tasks
  onTasksChange: Function,             // Update parent tasks
  isFetchingTasks: boolean,
  fetchError: string,
  onRefreshTasks: Function
})
```

### [src/components/SiteFooter.jsx](src/components/SiteFooter.jsx)
**Purpose:** Footer navigation and legal links

**Features:**
- Workspace navigation links
- Legal links (Terms, Privacy)
- Copyright notice with current year
- Responsive layout

**Props:**
```javascript
SiteFooter({
  navLinks: []  // Navigation links to display
})
```

---

## Pages

### [src/pages/Dashboard.jsx](src/pages/Dashboard.jsx)
**Purpose:** Main landing page for authenticated users

**Features:**
- Welcome message with user name
- Task statistics (completed count, total, completion %)
- Calls TasksFixed component to display task list
- Quick stats sidebar

**Props:**
```javascript
Dashboard({
  user: {},                            // User object
  tasks: [],                           // Task list
  onTasksChange: Function,             // Update tasks
  tasksLoading: boolean,
  tasksError: string,
  onRefreshTasks: Function
})
```

### [src/pages/CalendarPage.jsx](src/pages/CalendarPage.jsx)
**Purpose:** Wrapper page for calendar component

**Features:**
- Displays Calendar component in full-width layout
- Formats task times to locale-specific format
- Wraps calendar in responsive grid

**Props:**
```javascript
CalendarPage({
  tasks: []  // Task list for calendar
})
```

### [src/pages/Stats.jsx](src/pages/Stats.jsx)
**Purpose:** Analytics and statistics dashboard

**Features:**
- Completion metrics (completed vs total)
- Completion rate percentage
- Completion trend chart
- Task breakdown by priority
- Time-to-completion analysis

**Calculations:**
- Uses `utils/stats.js` helpers
- Tracks completion over time
- Shows trends and patterns

**Props:**
```javascript
Stats({
  tasks: []  // Task list for analysis
})
```

### [src/pages/ThemeSettings.jsx](src/pages/ThemeSettings.jsx)
**Purpose:** Theme selection and customization page

**Features:**
- Grid of 12+ theme cards with color previews
- Theme name and description
- Click to apply theme
- Stores selection in localStorage
- Real-time preview as you select

**Key Functions:**
- `handleThemeSelect(themeId)` - Apply theme and persist
- Uses ThemeContext to update global theme

**Props:** None

### [src/pages/Terms.jsx](src/pages/Terms.jsx)
**Purpose:** Terms of Service legal page

**Sections:**
1. Acceptance of Terms
2. Description of Service
3. Accounts and Security
4. License and Intellectual Property
5. Acceptable Use
6. Service Changes and Fees
7. Availability and Support
8. Termination
9. Updates to Terms

**Updated:** January 25, 2026

### [src/pages/Privacy.jsx](src/pages/Privacy.jsx)
**Purpose:** Privacy Policy legal page

**Sections:**
1. Information We Collect
2. How We Use Information
3. Data Security
4. Cookies and Local Storage
5. Data Retention
6. Children's Privacy
7. Your Rights
8. Policy Updates
9. Contact

**Key Points:**
- No third-party tracking
- Data encrypted in transit
- User data accessible via API
- 30-day deletion after account close
- GDPR and privacy law compliance

**Updated:** January 25, 2026

### [src/pages/reset-password.jsx](src/pages/reset-password.jsx)
**Purpose:** Password reset form accessed via email recovery link

**Features:**
- Validates recovery tokens from email link
- Real-time password strength indicator
- Checks: 8+ chars, mixed case, number/symbol, matching
- Updates user password in Supabase
- Signs out user after reset (forced re-login)
- Error handling for expired/invalid links

**Key State:**
```javascript
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [recoveryTokens] = useState(() => parseRecoveryTokens());
const [statusMessage, setStatusMessage] = useState("");
const [error, setError] = useState("");
const [verifying, setVerifying] = useState(true);
const [canReset, setCanReset] = useState(false);
const [submitting, setSubmitting] = useState(false);
```

**Key Functions:**
- `parseRecoveryTokens()` - Extract access/refresh tokens from URL hash
- `handleResetPassword()` - Update password via Supabase.auth.updateUser()
- Password strength checker with visual checklist

**Props:** None

---

## Context & Themes

### [src/context/ThemeContext.jsx](src/context/ThemeContext.jsx)
**Purpose:** React Context Provider for theme management

**Exports:**
- `ThemeProvider` - Wraps app with theme context
- `ThemeContext` - Context object

**Features:**
- Loads theme from localStorage on mount
- Applies theme CSS variables to document root
- Provides theme switching functionality
- Persists selection across sessions

**Context Value:**
```javascript
{
  theme: { id, label, tokens },  // Current theme object
  setTheme: (themeId) => {}       // Function to change theme
}
```

### [src/context/useTheme.js](src/context/useTheme.js)
**Purpose:** Custom hook to consume theme context

**Usage:**
```javascript
const { theme, setTheme } = useTheme();
```

### [src/themes/index.js](src/themes/index.js)
**Purpose:** Definitions for 12+ theme options

**Available Themes:**
1. **Aurora Default** - Original dark theme with violet accents
2. **Aurora Twilight** - Dark with blue accents
3. **Aurora Midnight** - Deeper dark with cyan accents
4. **Aurora Phantom** - Dark minimal with silver accents
5. **Aurora Eclipse** - Dark with red accents
6. **Aurora Nebula** - Dark with magenta accents
7. **Aurora Frost** - Light with blue accents
8. **Aurora Bloom** - Light with pink accents
9. **Aurora Serenity** - Light with teal accents
10. **Aurora Sunshine** - Light with yellow/orange accents
11. **Aurora Harvest** - Light with brown/orange accents
12. **Aurora Forest** - Light with green accents

**Each Theme Defines:**
```javascript
{
  id: "default",
  label: "Aurora Default",
  description: "...",
  preview: ["#101933", "#7b7dff", "#38e3ff"],  // RGB preview colors
  tokens: {
    "color-scheme": "dark",
    "--page-bg": "#101933",
    "--page-glow": "rgba(...)",
    "--text-primary": "#...",
    // ... 20+ CSS variables
  }
}
```

**CSS Variables Defined:**
- `color-scheme` - Light or dark theme preference
- `--page-bg` - Main background color
- `--page-bg-accent` - Secondary background
- `--page-glow` - Glowing effect color
- `--border` - Border color
- `--surface` - Card/surface color
- `--brand` - Primary brand color
- `--brand-accent` - Brand highlight
- `--text-primary` - Main text color
- `--text-muted` - Subtle text
- `--danger` - Error/delete color

---

## Utilities

### [src/utils/stats.js](src/utils/stats.js)
**Purpose:** Helper functions for calculating task statistics

**Key Functions:**
- `calculateCompletionRate(tasks)` - Returns % of completed tasks
- `getCompletionTrend(tasks, days)` - Completion over time
- `getTasksByPriority(tasks)` - Groups tasks by priority level
- `getTotalHours(tasks)` - Estimated total hours for all tasks
- `getAverageCompletionTime(tasks)` - Average days to complete

**Usage:**
```javascript
import { calculateCompletionRate, getTasksByPriority } from '@/utils/stats';

const rate = calculateCompletionRate(tasks);        // 75
const byPriority = getTasksByPriority(tasks);       // { high: [...], medium: [...], low: [...] }
```

---

## Configuration

### [index.html](index.html)
**Purpose:** HTML entry point for Vite

**Key Elements:**
- `<div id="root"></div>` - React mount point
- Font imports from Google Fonts (EB Garamond, Eagle Lake, Capriola)
- Viewport meta tag for responsive design
- Module script pointing to `src/main.jsx`

### [vite.config.js](vite.config.js)
**Purpose:** Vite build configuration

**Settings:**
- React plugin for JSX transformation
- Source map generation
- Optimized production build

### [vercel.json](vercel.json)
**Purpose:** Vercel deployment configuration

**Config:**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This enables SPA routing - all requests go to index.html and React Router handles them.

### [eslint.config.js](eslint.config.js)
**Purpose:** ESLint configuration for code quality

**Rules:**
- Recommended ESLint rules
- React hooks best practices
- React Fast Refresh compatibility
- No unused variables (except uppercase/underscore prefixed)
- Proper JSX syntax

### [package.json](package.json)
**Purpose:** Project metadata and dependencies

**Scripts:**
```json
{
  "dev": "vite",                    // Start dev server
  "build": "vite build",            // Production build
  "lint": "eslint .",               // Run ESLint
  "preview": "vite preview"         // Preview production build
}
```

**Dependencies:**
- `react@19.2.0` - UI library
- `react-dom@19.2.0` - DOM rendering
- `react-router-dom@7.12.0` - Client-side routing
- `@supabase/supabase-js@2.89.0` - Backend client

**Dev Dependencies:**
- `vite@7.2.4` - Build tool
- `@vitejs/plugin-react@5.1.1` - React plugin
- `eslint@9.39.1` - Code linting
- `eslint-plugin-react-hooks@7.0.1` - React hooks linting

### [.gitignore](.gitignore)
**Purpose:** Exclude files from git

**Ignored:**
- `node_modules/` - Dependencies
- `dist/`, `dist-ssr/` - Build output
- `.env` - Environment variables
- `.vscode/`, `.idea/` - Editor config
- `*.log` - Log files
- `.DS_Store` - macOS files

---

## Authentication Flow

### Sign Up
1. User enters email and password in Auth component
2. `handleSignup()` calls `supabase.auth.signUp()`
3. Supabase creates user account and sends confirmation email
4. User profile created in `profiles` table
5. `onAuthStateChange` event triggers, sets user state
6. App redirects to Dashboard

### Sign In
1. User enters credentials in Auth component
2. `handleLogin()` calls `supabase.auth.signInWithPassword()`
3. Supabase validates and returns session tokens
4. `onAuthStateChange` listener receives 'SIGNED_IN' event
5. User state updated, app renders authenticated pages

### Password Reset
1. User clicks "Forgot Password" in Auth
2. `handleResetPassword()` calls `supabase.auth.resetPasswordForEmail()`
3. Supabase sends recovery email with link: `https://taskflow1.vercel.app/reset-password#type=recovery&access_token=...`
4. User clicks email link, arrives on `/reset-password` page
5. `parseRecoveryTokens()` extracts tokens from URL hash
6. Component validates tokens and shows reset form
7. User enters new password (with strength validation)
8. `supabase.auth.updateUser({ password: ... })` updates password
9. `supabase.auth.signOut()` logs out user
10. User redirected to login, must sign in with new password

### Session Management
- Supabase stores JWT tokens in localStorage
- `onAuthStateChange` listener runs on app mount
- Tokens automatically refreshed when needed
- Sign out clears tokens and session
- Password reset invalidates existing sessions

---

## Data Models

### User Object (from Supabase Auth)
```javascript
{
  id: "uuid",                    // User ID
  email: "user@example.com",
  user_metadata: {
    email: "user@example.com",
    email_verified: true,
    first_name: "John",
    full_name: "John Doe",
    last_name: "Doe"
  },
  aud: "authenticated",
  created_at: "2026-01-29T...",
  confirmed_at: "2026-01-29T...",
  last_sign_in_at: "2026-01-29T..."
}
```

### Task Object (from Supabase Database)
```javascript
{
  id: "uuid",                    // Task ID
  user_id: "uuid",               // Owner's user ID
  title: "Complete project",
  description: "Finish React app",
  due_date: "2026-02-15T14:30:00.000Z",  // ISO 8601 datetime
  completed: false,              // Completion status
  priority: "high",              // low | medium | high
  created_at: "2026-01-29T...",
  updated_at: "2026-01-29T..."
}
```

### Profile Object (from Supabase Database)
```javascript
{
  id: "uuid",                    // Same as user ID
  email: "user@example.com",
  first_name: "John",
  last_name: "Doe",
  full_name: "John Doe",
  created_at: "2026-01-29T...",
  updated_at: "2026-01-29T..."
}
```

---

## Key Features & How They Work

### 1. Task Management
- **Create:** TasksFixed form submits to `supabase.from('tasks').insert()`
- **Read:** App mounts, fetches all user tasks on startup
- **Update:** Click edit button, modify fields, submit to Supabase
- **Delete:** Right-click context menu, confirm, call `.delete()`
- **Real-time:** Supabase subscriptions notify all clients of changes

### 2. Calendar View
- Filters tasks by date
- Displays only tasks with due_date on selected day
- Shows task count per day in month view
- Allows navigation forward/backward through time periods

### 3. Statistics
- Calculates completion rate: `completed.length / total.length * 100`
- Groups tasks by priority
- Shows completion trend over selected period
- Displays estimated work hours

### 4. Theme System
- 12 pre-defined themes with custom color palettes
- Theme loaded from localStorage on app start
- CSS variables applied to document root
- Switching theme updates localStorage and refreshes page styles

### 5. Responsive Design
- Mobile menu button in header (hidden on desktop)
- Tasks display as list on mobile, adjust width on desktop
- Calendar scaling for smaller screens
- All breakpoints defined in index.css

### 6. Password Reset
- Email contains unique recovery token
- Token valid for 1 hour from email send
- New password must meet strength requirements
- Tokens invalidate after successful reset

---

## Deployment (Vercel)

### Build Process
1. `npm run build` runs `vite build`
2. Vite transforms JSX, optimizes code
3. Output goes to `dist/` folder
4. Vercel serves `dist/index.html` for all routes (SPA rewrite in vercel.json)

### Environment Variables (Set in Vercel)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public authentication key

### Database Schema (Supabase)
```sql
-- tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
CREATE POLICY task_access_policy ON tasks
  FOR SELECT USING (auth.uid() = user_id);
```

---

## Common Workflows

### Adding a New Feature
1. Create component in `src/components/` or page in `src/pages/`
2. Add route to App.jsx Routes
3. Add styling to `src/index.css`
4. Test with `npm run dev`
5. Build with `npm run build`
6. Commit and push - Vercel auto-deploys

### Creating a New Theme
1. Open `src/themes/index.js`
2. Add new object to themes array with:
   - Unique `id`
   - User-friendly `label`
   - `description`
   - `preview` colors
   - CSS `tokens` object (copy existing theme, modify colors)
3. Themes appear automatically in ThemeSettings page

### Fixing a Bug
1. Identify issue (browser console, Vercel logs, etc.)
2. Reproduce locally with `npm run dev`
3. Add `console.log()` to debug
4. Check ESLint with `npm run lint`
5. Fix issue and test
6. Commit and push

### Adding Database Migration
1. Create table/column in Supabase dashboard
2. Update RLS policies if needed
3. Update data models in code comments
4. Update queries in components

---

## Performance Optimization

### Code Splitting
- React Router enables route-based code splitting
- Each page loads only when visited
- Vite handles dynamic imports

### Memoization
- `useCallback()` memoizes event handlers
- Prevents unnecessary re-renders
- Used in task sorting, calendar navigation

### Real-time Updates
- Supabase subscriptions only update changed tasks
- Not entire task list re-fetches
- Efficient delta updates via postgres_changes

### CSS
- CSS custom properties for theming (no runtime calculations)
- Minimal JavaScript for styling (CSS-in-JS avoided)
- Pre-compiled CSS with Vite

---

## Testing Checklist

- [ ] User signup and account creation
- [ ] User login with email/password
- [ ] Password reset flow (check email, reset works)
- [ ] Create new task
- [ ] Edit existing task
- [ ] Mark task complete/incomplete
- [ ] Delete task
- [ ] Calendar day view shows correct tasks
- [ ] Calendar month view shows task count
- [ ] Calendar year view shows all months
- [ ] Stats page calculates completion rate
- [ ] Theme switching persists across sessions
- [ ] Mobile menu opens/closes
- [ ] Terms page loads
- [ ] Privacy page loads
- [ ] Logout clears session
- [ ] Real-time updates when task changed in another tab

---

## Support & Contact

- **Email:** support@taskflow.app (mentioned in Terms)
- **Issues:** Check Vercel deployment logs
- **Database:** Manage at supabase.com project dashboard
- **Code:** https://github.com/stanleytarun777/TaskFlow-Lane

---

**Documentation Last Updated:** January 29, 2026  
**App Version:** 0.0.0  
**React Version:** 19.2.0  
**Vite Version:** 7.2.4
