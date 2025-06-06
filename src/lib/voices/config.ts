import path from 'path';

export const getVoicesDir = () => {
	return process.env.VOICES_DIR || path.join(process.cwd(), 'data', 'voices');
};
