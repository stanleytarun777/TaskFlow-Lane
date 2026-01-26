import { useState } from "react";
import { NavLink } from "react-router-dom";

function Sidebar({ navLinks = [], isOpen, onClose, user, onLogout }) {
	const displayName = getDisplayName(user);
	const [accountExpanded, setAccountExpanded] = useState(false);
	const accountOpen = accountExpanded;

	const handleCloseSidebar = () => {
		setAccountExpanded(false);
		if (typeof onClose === "function") {
			onClose();
		}
	};

	const handleLinkClick = () => {
		handleCloseSidebar();
	};

	return (
		<>
			<div
				className={`sidebar-backdrop${isOpen ? " is-open" : ""}`}
				onClick={handleCloseSidebar}
				role="presentation"
			/>
				<aside className={`sidebar${isOpen ? " is-open" : ""}`} aria-label="Primary navigation">
					<section className={`sidebar-account${accountOpen ? " is-open" : ""}`} aria-label="Account information">
						<button
							type="button"
							className="sidebar-account__toggle"
							onClick={() => setAccountExpanded((open) => !open)}
							aria-expanded={accountOpen}
						>
							<span className="sidebar-link__icon" aria-hidden="true">
								<Icon name="settings" />
							</span>
							<div>
								<p className="sidebar-account__title">Account</p>
								<p className="sidebar-account__subtitle">Personal details</p>
							</div>
						</button>
						{accountOpen && (
							<div className="sidebar-account__panel is-inline">
								<div className="sidebar-account__identity">
									<div className="sidebar-account__details">
										<p className="sidebar__name">{displayName}</p>
										<p className="sidebar__email" title={user?.email || ""}>{user?.email}</p>
									</div>
								</div>
							</div>
						)}
					</section>

				<nav className="sidebar__nav">
					{navLinks.map(({ to, label, exact, icon }) => (
						<NavLink
							key={to}
							to={to}
							end={exact}
							className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
							onClick={handleLinkClick}
						>
							<span className="sidebar-link__icon" aria-hidden="true">
								<Icon name={icon} />
							</span>
							<span>{label}</span>
						</NavLink>
					))}
				</nav>

				<div className="sidebar__footer">
					<button type="button" className="sidebar-logout" onClick={onLogout}>
						<span className="sidebar-link__icon" aria-hidden="true">
							<Icon name="shield" />
						</span>
						Sign out
					</button>
				</div>
			</aside>
		</>
	);
}

function getDisplayName(user) {
	const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name;
	if (metadataName) {
		return metadataName.trim();
	}
	if (user?.email) {
		return user.email.split("@")[0];
	}
	return "Creator";
}

function Icon({ name }) {
	switch (name) {
		case "grid":
			return (
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
					<rect x="3" y="3" width="7" height="7" rx="2" />
					<rect x="14" y="3" width="7" height="7" rx="2" />
					<rect x="3" y="14" width="7" height="7" rx="2" />
					<rect x="14" y="14" width="7" height="7" rx="2" />
				</svg>
			);
		case "calendar":
			return (
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
					<rect x="3" y="5" width="18" height="16" rx="3" />
					<line x1="3" y1="10" x2="21" y2="10" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="16" y1="2" x2="16" y2="6" />
				</svg>
			);
		case "chart":
			return (
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
					<path d="M4 20V10" />
					<path d="M10 20V4" />
					<path d="M16 20v-6" />
					<path d="M22 20v-9" />
				</svg>
			);
		case "palette":
			return (
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
					<path d="M12 3c-4.97 0-9 3.58-9 8 0 3.31 2.69 6 6 6h1a1 1 0 0 1 1 1v1.5c0 1 0.86 1.8 1.86 1.48A8 8 0 0 0 21 13c0-5-4.03-10-9-10Z" />
					<circle cx="7.5" cy="10.5" r="1" />
					<circle cx="12" cy="7.5" r="1" />
					<circle cx="16.5" cy="10.5" r="1" />
					<circle cx="12" cy="13.5" r="1" />
				</svg>
			);
		case "settings":
			return (
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
					<circle cx="12" cy="12" r="3" />
					<path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1-1.2 1.6l-.1-.05a1 1 0 0 0-1.2.15l-.7.7a1 1 0 0 1-1.7-.7v-.2a1 1 0 0 0-.9-1H10a1 1 0 0 0-.9 1v.2a1 1 0 0 1-1.7.7l-.7-.7a1 1 0 0 0-1.2-.15l-.1.05a1 1 0 0 1-1.2-1.6l.1-.1a1 1 0 0 0 .2-1.1l-.2-.67a1 1 0 0 1 0-.66l.2-.67a1 1 0 0 0-.2-1.1l-.1-.1A1 1 0 0 1 3.6 9l.1.05a1 1 0 0 0 1.2-.15l.7-.7a1 1 0 0 1 1.7.7v.2a1 1 0 0 0 .9 1h4a1 1 0 0 0 .9-1v-.2a1 1 0 0 1 1.7-.7l.7.7a1 1 0 0 0 1.2.15l.1-.05a1 1 0 0 1 1.2 1.6l-.1.1a1 1 0 0 0-.2 1.1l.2.67a1 1 0 0 1 0 .66Z" />
				</svg>
			);
		case "shield":
			return (
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
					<path d="M12 2 4 5v6c0 5 3.3 9.4 8 11 4.7-1.6 8-6 8-11V5Z" />
					<path d="M9.5 12 11 13.5 14.5 10" />
				</svg>
			);
		default:
			return (
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
					<circle cx="12" cy="12" r="10" />
				</svg>
			);
	}
}

export default Sidebar;
