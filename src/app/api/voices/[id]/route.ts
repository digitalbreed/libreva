import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

// Specify Node.js runtime
export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

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

		if (!voice) {
			return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
		}

		return NextResponse.json({
			...voice,
			tags: voice.tags ? voice.tags.split(',') : [],
		});
	} catch (error) {
		console.error('Error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const updates = await request.json();
		const { tags, ...voiceUpdates } = updates;

		// Only proceed with voice update if there are actual updates
		if (Object.keys(voiceUpdates).length > 0) {
			// Build the SET clause dynamically
			const setClause = Object.entries(voiceUpdates)
				.map(([key]) => `\`${key}\` = ?`)
				.join(', ');
			const values = Object.values(voiceUpdates);

			// Update voice
			const result = await run(`UPDATE voices SET ${setClause} WHERE id = ?`, [
				...values,
				id,
			]);

			if (result.changes === 0) {
				return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
			}
		}

		// Update tags if provided
		if (tags) {
			await run('DELETE FROM voice_tags WHERE voice_id = ?', [id]);
			if (tags.length > 0) {
				const tagValues = tags.map((tag: string) => [id, tag]);
				await run('INSERT INTO voice_tags (voice_id, tag) VALUES ?', [tagValues]);
			}
		}

		// Fetch the updated voice
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

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const now = new Date().toISOString();
		const result = await run('UPDATE voices SET deleted_at = ? WHERE id = ?', [now, id]);

		if (result.changes === 0) {
			return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
