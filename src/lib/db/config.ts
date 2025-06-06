import path from 'path';

export const getDbPath = () => {
	return process.env.DB_PATH || path.join(process.cwd(), 'data', 'db', 'libreva.db');
};

export const getSchemaPath = () => {
	return path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
};
