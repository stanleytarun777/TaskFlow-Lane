# Real-Time Integration Guide - TaskFlow

## Overview
This document explains how real-time integration works across all TaskFlow pages and components, ensuring that when you mark a task as done (or make any change), ALL pages update instantly.

## Architecture

### Data Flow
```
TasksFixed.jsx (toggleTask) 
  ↓
updateTasks() [local state update]
  ↓
onTasksChange callback to parent (App.jsx)
  ↓
setTasks() in App.jsx [global state update]
  ↓
Supabase backend update (completed flag change)
  ↓
Real-time subscription notifies all clients
  ↓
applyRealtimeChange() processes the update
  ↓
setTasks() updates state [second time]
  ↓
React re-renders: Dashboard → Stats → Calendar → All components using tasks prop
```

## Component Integration

### 1. Stats Page (src/pages/Stats.jsx)
**Purpose**: Display performance analytics and statistics

**How Real-Time Integration Works**:
- Added `updateKey` state that increments when `tasks` prop changes
- All `useMemo` hooks include `updateKey` in dependencies
- Forces recalculation of:
  - Completion rate metrics
  - Focus load calculations
  - Task volume tracking
  - Priority breakdown
  - Overdue risk assessment

**Code Pattern**:
```jsx
const [updateKey, setUpdateKey] = useState(0);

useEffect(() => {
  setUpdateKey((prev) => prev + 1);  // Force update on task change
}, [tasks]);

const summary = useMemo(() => computeSummaryMetrics(currentTasks), [currentTasks, updateKey]);
```

**Result**: When you toggle a task to completed:
- Stats immediately show updated completion rate
- Priority breakdown updates
- Active task count decreases
- Overdue count updates if applicable

### 2. Calendar Page (src/pages/CalendarPage.jsx)
**Purpose**: Display tasks in a calendar view

**How Real-Time Integration Works**:
- Added `updateKey` state that increments when `tasks` prop changes
- `localTimes` memo includes `updateKey` in dependencies
- Calendar component receives updated task list
- Tasks are re-indexed by date

**Code Pattern**:
```jsx
const [updateKey, setUpdateKey] = useState(0);

useEffect(() => {
  setUpdateKey((prev) => prev + 1);  // Force update on task change
}, [tasks]);

const localTimes = useMemo(() => {
  // ... process tasks
  return entries;
}, [tasks, updateKey]);
```

**Result**: When you toggle a task:
- Calendar immediately reflects completed/active status
- Task appears/disappears from calendar based on completion
- Due date display updates instantly

### 3. Dashboard Page (src/pages/Dashboard.jsx)
**Purpose**: Main task management interface

**How Real-Time Integration Works**:
- Dashboard tracks sync state with task counts
- Sync state updates whenever tasks change
- Includes completed task count for UI indicators
- Tasks are rendered via TasksFixed component

**Code Pattern**:
```jsx
useEffect(() => {
  if (typeof window === "undefined") return undefined;
  const syncState = {
    realtime: true,
    taskCount: tasks.length,
    completedCount: tasks.filter((t) => t.completed).length,
  };
  window.__taskflowSync = syncState;
  return () => clearInterval(timer);
}, [tasks]);  // Dependency on tasks
```

**Result**: When you complete a task:
- Task immediately marked as done in Dashboard
- Sync state updates with new counts
- TasksFixed component re-renders with new task state

### 4. App.jsx Root Component
**Purpose**: Manage authentication, fetch tasks, handle real-time subscriptions

**How Real-Time Integration Works**:

#### Real-Time Subscription
```jsx
useEffect(() => {
  const channel = supabase
    .channel(`tasks-realtime-${user.id}`)
    .on("postgres_changes", 
      { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
      (payload) => applyRealtimeChange(payload)
    )
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, [user, applyRealtimeChange]);
```

#### Real-Time Change Handler
```jsx
const applyRealtimeChange = useCallback((payload) => {
  setTasks((current) => {
    // Handle DELETE events
    if (payload.eventType === "DELETE" && payload.old?.id) {
      const updated = current.filter((task) => task.id !== payload.old.id);
      console.log("[TaskFlow Real-Time] Task deleted:", payload.old.id);
      return updated;
    }
    
    // Handle INSERT/UPDATE events
    const incoming = normalizeTask(payload.new);
    const existingIndex = current.findIndex((task) => task.id === incoming.id);
    
    if (existingIndex === -1) {
      // New task - add it
      const updated = sortTasks([...current, incoming]);
      console.log("[TaskFlow Real-Time] Task inserted:", incoming.id);
      return updated;
    }
    
    // Existing task - update it
    const old = current[existingIndex];
    const next = [...current];
    next[existingIndex] = incoming;
    const sorted = sortTasks(next);
    
    if (old.completed !== incoming.completed) {
      console.log("[TaskFlow Real-Time] Task toggled:", incoming.id, "completed:", incoming.completed);
    }
    
    return sorted;
  });
}, [normalizeTask, sortTasks]);
```

#### Child Component Updates
```jsx
const handleChildTasksChange = useCallback((nextValue) => {
  setTasks((prev) => {
    const resolved = typeof nextValue === "function" ? nextValue(prev) : nextValue;
    const sorted = sortTasks(resolved);
    console.log("[TaskFlow] Child component update:", sorted.length, "tasks");
    return sorted;
  });
}, [sortTasks]);
```

**Result**: 
- Real-time subscription listens to database changes
- When ANY user (including you) updates a task in the database
- The subscription immediately applies the change
- All pages re-render with updated data

## Testing Real-Time Integration

### Prerequisites
- Have the app open in two browser windows/tabs
- Be logged in as the same user in both windows
- Open the browser Developer Console (F12)

### Test Procedure

#### Test 1: Stats Page Update
1. Go to `/stats` in one window
2. Go to `/` (Dashboard) in the other window
3. In Dashboard window, check a task as complete
4. In Stats window, verify:
   - Completion rate increased
   - Active task count decreased
   - Task appears in "finished" count
5. Check console for: `[TaskFlow Real-Time] Task toggled: <task_id> completed: true`

#### Test 2: Calendar Page Update
1. Go to `/calendar` in one window
2. Go to `/` (Dashboard) in the other window
3. In Dashboard window, check a task as complete
4. In Calendar window, verify:
   - Task status changes (styling, appearance)
   - Calendar is updated with new task counts
5. Check console for: `[TaskFlow Real-Time] Task toggled: <task_id> completed: true`

#### Test 3: Multiple Page Sync
1. Open 3 windows: Dashboard, Stats, Calendar (same user)
2. In Dashboard, toggle a task (check or uncheck)
3. Verify ALL three pages show:
   - Updated task status
   - Updated counts
   - Consistent state across pages
4. Verify console shows:
   - `[TaskFlow Real-Time] Event received: UPDATE`
   - `[TaskFlow Real-Time] Task toggled: <task_id> completed: <value>`
   - `[TaskFlow] Child component update: <count> tasks`

#### Test 4: Real-Time Logging
1. Open browser console
2. Complete a task
3. You should see logs:
   - Task completion message
   - Real-time event reception
   - Updated task count

### Console Output Examples

**Expected console output when toggling a task**:
```
[TaskFlow Real-Time] Event received: UPDATE
[TaskFlow Real-Time] Task toggled: abc123 completed: true
[TaskFlow] Child component update: 12 tasks
```

**Expected console output when creating a task**:
```
[TaskFlow Real-Time] Event received: INSERT
[TaskFlow Real-Time] Task inserted: def456
[TaskFlow] Child component update: 13 tasks
```

**Expected console output when deleting a task**:
```
[TaskFlow Real-Time] Event received: DELETE
[TaskFlow Real-Time] Task deleted: ghi789 Remaining: 12
[TaskFlow] Child component update: 12 tasks
```

## Common Issues & Solutions

### Issue: Stats doesn't update when task completes
**Solution**: 
- Verify `updateKey` is in all Stats memo dependencies
- Check that CalendarPage is passing `tasks` prop correctly
- Confirm real-time subscription is active (check console for `[TaskFlow Real-Time] Channel status: SUBSCRIBED`)

### Issue: Calendar doesn't reflect task changes
**Solution**:
- Verify CalendarPage useEffect is triggering (check console for updateKey logs)
- Confirm `localTimes` memo includes `updateKey` dependency
- Check that Calendar component is receiving updated tasks prop

### Issue: Real-time updates not showing in any page
**Solution**:
- Open console and check for `[TaskFlow Real-Time] Channel status` messages
- Verify Supabase connection is working
- Check that user is authenticated (not just logged in)
- Verify real-time subscriptions are enabled in Supabase project settings

### Issue: Only Dashboard updates, other pages don't
**Solution**:
- Verify all pages are receiving the `tasks` prop from App.jsx
- Check that useEffect dependencies are correct on each page
- Confirm updateKey is triggering on all pages

## Performance Optimization

The real-time integration uses:
- **useMemo**: Prevents unnecessary recalculations
- **useCallback**: Maintains stable function references
- **updateKey pattern**: Forces evaluation when needed without changing data
- **Optimistic updates**: UI updates before server confirmation
- **User-scoped subscriptions**: Only listen to current user's changes

## Security Notes

All real-time subscriptions are filtered by `user_id`:
```jsx
filter: `user_id=eq.${user.id}`
```

This ensures:
- Users only receive updates for their own tasks
- No cross-user data leakage
- Multi-user isolation maintained at subscription level

## Files Modified

1. **src/pages/Stats.jsx**
   - Added useEffect for updateKey
   - Updated all memo dependencies

2. **src/pages/CalendarPage.jsx**
   - Added useEffect for updateKey
   - Updated localTimes memo dependencies

3. **src/pages/Dashboard.jsx**
   - Enhanced sync state with task counts
   - Updated useEffect dependency to include tasks

4. **src/App.jsx**
   - Added real-time debugging logging
   - Enhanced applyRealtimeChange documentation
   - Improved handleChildTasksChange logging

## Verification Checklist

- [ ] Stats page updates when tasks complete
- [ ] Calendar page updates when tasks complete
- [ ] Dashboard shows real-time task changes
- [ ] Completion rate changes instantly in Stats
- [ ] Priority breakdown updates in real-time
- [ ] Task count updates across all pages
- [ ] Console shows real-time event logs (dev mode)
- [ ] No console errors when toggling tasks
- [ ] All pages stay in sync
- [ ] Multiple windows show identical state

## Next Steps

Monitor for any remaining real-time sync issues:
1. Enable development mode logging (already added)
2. Test with multiple users simultaneously
3. Verify performance with large task lists (50+ tasks)
4. Monitor Supabase real-time connection stability
