'use server';

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getDbPath, getSchemaPath } from './config';

let db: Database | null = null;

async function ensureDbExists() {
	const dbPath = getDbPath();
	const dbDir = join(dbPath, '..');

	if (!existsSync(dbDir)) {
		mkdirSync(dbDir, { recursive: true });
	}
}

export async function getDb(): Promise<Database> {
	if (db) return db;

	await ensureDbExists();

	const dbPath = getDbPath();
	db = await open({
		filename: dbPath,
		driver: sqlite3.Database,
	});

	// Enable foreign keys
	await db.run('PRAGMA foreign_keys = ON');

	// Initialize schema if needed
	const schemaPath = getSchemaPath();
	const schema = readFileSync(schemaPath, 'utf-8');
	await db.exec(schema);

	return db;
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
	const db = await getDb();
	return db.all<T[]>(sql, params);
}

export async function queryOne<T = unknown>(
	sql: string,
	params: unknown[] = []
): Promise<T | undefined> {
	const db = await getDb();
	return db.get<T>(sql, params);
}

export async function run(
	sql: string,
	params: unknown[] = []
): Promise<{ lastID: number; changes: number }> {
	const db = await getDb();
	const result = await db.run(sql, params);
	return {
		lastID: result.lastID ?? 0,
		changes: result.changes ?? 0,
	};
}
