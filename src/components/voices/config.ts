export const MAX_FILE_SIZE_BYTES = parseInt(
	process.env.NEXT_PUBLIC_MAX_VOICE_FILE_SIZE || '5242880'
);
export const MAX_FILE_SIZE_MB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
