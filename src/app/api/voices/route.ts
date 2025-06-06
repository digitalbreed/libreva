import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Specify Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const notes = formData.get('notes') as string;
		const gender = formData.get('gender') as 'male' | 'female' | null;
		const tags = formData.get('tags') as string;
		const file = formData.get('file') as File;

		if (!name || !file) {
			return NextResponse.json({ error: 'Name and file are required' }, { status: 400 });
		}

		// Generate unique filename
		const fileExtension = file.name.split('.').pop();
		const id = uuidv4();
		const fileName = `${id}.${fileExtension}`;

		// Save file
		const voicesDir = process.env.VOICES_DIR || join(process.cwd(), 'data', 'voices');
		const filePath = join(voicesDir, fileName);

		// Ensure directories exist
		await mkdir(voicesDir, { recursive: true });
		await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

		// Generate waveform using TTS service
		const ttsServiceUrl = process.env.TTS_SERVICE_URL || 'http://libreva-tts:3100';
		const waveformResponse = await fetch(`${ttsServiceUrl}/generate-waveform`, {
			method: 'POST',
			body: formData,
		});

		if (!waveformResponse.ok) {
			throw new Error('Failed to generate waveform');
		}

		// Save waveform image
		const waveformFileName = `${id}.png`;
		const waveformPath = join(voicesDir, waveformFileName);

		// Save waveform
		await writeFile(waveformPath, Buffer.from(await waveformResponse.arrayBuffer()));

		// Save to database
		const now = new Date().toISOString();
		await run(
			`INSERT INTO voices (id, name, notes, gender, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[id, name, notes || '', gender || null, now, now]
		);

		// Add tags if provided
		if (tags) {
			const tagList = JSON.parse(tags) as string[];
			if (tagList.length > 0) {
				const tagValues = tagList.map((tag) => [id, tag]);
				await run(
					`INSERT INTO voice_tags (voice_id, tag) VALUES ${tagValues.map(() => '(?, ?)').join(', ')}`,
					tagValues.flat()
				);
			}
		}

		// Fetch the created voice
		const [voice] = await query<{
			id: string;
			name: string;
			notes: string | null;
			gender: 'male' | 'female' | null;
			is_favorite: boolean;
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

		return NextResponse.json({
			...voice,
			tags: voice.tags ? voice.tags.split(',') : [],
		});
	} catch (error) {
		console.error('Error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '10');
		const search = searchParams.get('search') || '';
		const offset = (page - 1) * limit;

		// Base query with search condition
		const searchCondition = search ? `AND (v.name LIKE ? OR v.notes LIKE ?)` : '';
		const searchValues = search ? [`%${search}%`, `%${search}%`] : [];

		const voices = await query<{
			id: string;
			name: string;
			notes: string | null;
			gender: 'male' | 'female' | null;
			is_favorite: boolean;
			created_at: string;
			updated_at: string;
			tags: string;
		}>(
			`SELECT v.*, GROUP_CONCAT(vt.tag) as tags
			FROM voices v
			LEFT JOIN voice_tags vt ON v.id = vt.voice_id
			WHERE v.deleted_at IS NULL ${searchCondition}
			GROUP BY v.id
			ORDER BY v.created_at DESC
			LIMIT ? OFFSET ?`,
			[...searchValues, limit, offset]
		);

		// Get total count for pagination with search
		const [{ total }] = await query<{ total: number }>(
			`SELECT COUNT(*) as total 
			FROM voices v 
			WHERE v.deleted_at IS NULL ${searchCondition}`,
			searchValues
		);

		return NextResponse.json({
			voices: voices.map((voice) => ({
				...voice,
				tags: voice.tags ? voice.tags.split(',') : [],
			})),
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error('Error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
