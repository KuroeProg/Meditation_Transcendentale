/**
 * A highly robust, non-blocking remote logger for React.
 * Pushes critical user events to ELK safely in the background.
 */

const LOG_ENDPOINT = "/api/logs/client/";

const sendLog = async (level, message, context = {}) => {
	// Only run in production or strictly enforced environments, but here we run it always for ELK
	try {
        const payload = {
            level: level,
            message: message,
            context: {
                userAgent: navigator.userAgent,
                route: window.location.pathname,
                ...context
            }
        };

        // We use full URL to avoid weird proxying bugs if VITE_API_ORIGIN exists
        const baseUrl = import.meta.env.VITE_API_ORIGIN || "";

		await fetch(`${baseUrl}${LOG_ENDPOINT}`, {
			method: "POST",
			headers: { 
                "Content-Type": "application/json" 
            },
			body: JSON.stringify(payload),
            // "keepalive" ensures log sends even if user closes the tab mid-request
            keepalive: true
		});
	} catch (e) {
		// Suppress network errors from logger so we don't cause infinite loops
		console.debug("Failed to remote log:", e);
	}
};

export const RemoteLogger = {
	info: (message, context) => sendLog("INFO", message, context),
	warn: (message, context) => sendLog("WARNING", message, context),
	error: (message, context) => sendLog("ERROR", message, context),
    debug: (message, context) => sendLog("DEBUG", message, context),
};
