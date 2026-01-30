import React, { useEffect, useMemo, useState } from "react";
import Calendar from "../components/Calendar";

function CalendarPage({ tasks = [] }) {
	const [updateKey, setUpdateKey] = useState(0);

	// Force re-render when tasks update to ensure calendar reflects latest data
	useEffect(() => {
		setUpdateKey((prev) => prev + 1);
	}, [tasks]);

	const localTimes = useMemo(() => {
		const entries = {};
		tasks.forEach((task) => {
			if (!task.dueDate) return;
			const date = new Date(task.dueDate);
			if (Number.isNaN(date.getTime())) return;
			entries[task.id] = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
		});
		return entries;
	}, [tasks, updateKey]);

	return (
		<div className="page-container" aria-label="Calendar">
			<section className="page-grid" aria-label="Calendar layout">
				<article className="glow-card" style={{ gridColumn: "1 / -1" }}>
					<Calendar tasks={tasks} localTimes={localTimes} />
				</article>
			</section>
		</div>
	);
}

export default CalendarPage;
