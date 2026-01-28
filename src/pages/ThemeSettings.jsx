import React from "react";
import { useTheme } from "../context/useTheme";

function ThemeSettings() {
	const { themes, themeId, setTheme } = useTheme();

	return (
		<section className="page-container theme-settings">
			<div className="glass-panel theme-settings__panel" aria-labelledby="change-theme-heading">
				<div className="theme-settings__header">
					<p className="eyebrow-label">Preferences</p>
					<h1 id="change-theme-heading">Change Theme</h1>
					<p className="muted">
						Select a palette that matches your focus. Changes are applied instantly and persist for future sessions.
					</p>
				</div>
				<div className="theme-grid" role="list">
					{themes.map((theme) => {
						const isActive = theme.id === themeId;
						return (
							<button
								type="button"
								key={theme.id}
								role="listitem"
								className={`theme-card${isActive ? " is-active" : ""}`}
								onClick={() => setTheme(theme.id)}
								aria-pressed={isActive}
							>
								<div className="theme-card__preview" aria-hidden="true">
									{theme.preview.map((color, index) => (
										<span
											key={`${theme.id}-${index}`}
											className="theme-card__swatch"
											style={{ backgroundColor: color }}
										/>
									))}
								</div>
								<div className="theme-card__meta">
									<strong>{theme.label}</strong>
									<span>{theme.description}</span>
								</div>
								{isActive && <span className="theme-card__badge">Active</span>}
							</button>
						);
					})}
				</div>
			</div>
		</section>
	);
}

export default ThemeSettings;
