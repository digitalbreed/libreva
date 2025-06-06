import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import path from 'path';
import { getVoicesDir } from './voices/config';
import { run, query } from './db';

// Specify Node.js runtime
export const runtime = 'nodejs';

export interface Voice {
	id: string;
	name: string;
	notes: string;
	gender: 'male' | 'female' | null;
	isFavorite: boolean;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface VoiceInput {
	file: File;
	name: string;
	notes?: string;
	gender?: 'male' | 'female' | null;
	tags?: string[];
}

export async function saveVoiceFile(file: File, id: string): Promise<void> {
	const voicesDir = getVoicesDir();
	const filePath = path.join(voicesDir, `${id}.wav`);

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	await writeFile(filePath, buffer);
}

export async function saveVoice(input: VoiceInput): Promise<Voice> {
	const id = uuidv4();
	const now = new Date().toISOString();

	// Save voice file
	await saveVoiceFile(input.file, id);

	// Save voice metadata to database
	await run(
		`INSERT INTO voices (id, name, notes, gender, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		[id, input.name, input.notes || '', input.gender || null, now, now]
	);

	// Save tags if any
	if (input.tags && input.tags.length > 0) {
		const tagValues = input.tags.map((tag) => [id, tag]);
		await run(
			`INSERT INTO voice_tags (voice_id, tag) VALUES ${tagValues.map(() => '(?, ?)').join(', ')}`,
			tagValues.flat()
		);
	}

	return {
		id,
		name: input.name,
		notes: input.notes || '',
		gender: input.gender || null,
		isFavorite: false,
		tags: input.tags || [],
		createdAt: now,
		updatedAt: now,
	};
}

export async function updateVoice(id: string, updates: Partial<Voice>): Promise<Voice> {
	const now = new Date().toISOString();
	const updateFields: string[] = [];
	const params: unknown[] = [];

	if (updates.name !== undefined) {
		updateFields.push('name = ?');
		params.push(updates.name);
	}
	if (updates.notes !== undefined) {
		updateFields.push('notes = ?');
		params.push(updates.notes);
	}
	if (updates.gender !== undefined) {
		updateFields.push('gender = ?');
		params.push(updates.gender);
	}
	if (updates.isFavorite !== undefined) {
		updateFields.push('is_favorite = ?');
		params.push(updates.isFavorite ? 1 : 0);
	}

	updateFields.push('updated_at = ?');
	params.push(now);
	params.push(id);

	await run(`UPDATE voices SET ${updateFields.join(', ')} WHERE id = ?`, params);

	// Update tags if provided
	if (updates.tags !== undefined) {
		await run('DELETE FROM voice_tags WHERE voice_id = ?', [id]);
		if (updates.tags.length > 0) {
			const tagValues = updates.tags.map((tag) => [id, tag]);
			await run(
				`INSERT INTO voice_tags (voice_id, tag) VALUES ${tagValues.map(() => '(?, ?)').join(', ')}`,
				tagValues.flat()
			);
		}
	}

	// Fetch updated voice
	const [voice] = await query<{
		id: string;
		name: string;
		notes: string;
		gender: string | null;
		is_favorite: number;
		created_at: string;
		updated_at: string;
		tags: string;
	}>(
		`SELECT v.*, GROUP_CONCAT(vt.tag) as tags
		 FROM voices v
		 LEFT JOIN voice_tags vt ON v.id = vt.voice_id
		 WHERE v.id = ?
		 GROUP BY v.id`,
		[id]
	);

	return {
		id: voice.id,
		name: voice.name,
		notes: voice.notes,
		gender: voice.gender as 'male' | 'female' | null,
		isFavorite: Boolean(voice.is_favorite),
		tags: voice.tags ? voice.tags.split(',') : [],
		createdAt: voice.created_at,
		updatedAt: voice.updated_at,
	};
}

export async function deleteVoice(id: string): Promise<void> {
	await run('DELETE FROM voices WHERE id = ?', [id]);
}
