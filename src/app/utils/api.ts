export function getApiUrl(path: string): string {
	// Get the basePath from next.config.js
	const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
	return `${basePath}${path}`;
}
