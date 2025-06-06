import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Specify Node.js runtime
export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		// Check if voice exists
		const voice = await query<{ id: string }>('SELECT id FROM voices WHERE id = ?', [id]);

		if (!voice || voice.length === 0) {
			return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
		}

		// Read the file
		const voicesDir = process.env.VOICES_DIR || join(process.cwd(), 'data', 'voices');
		const filePath = join(voicesDir, `${id}.wav`);
		const fileBuffer = await readFile(filePath);

		// Return the file
		return new NextResponse(fileBuffer, {
			headers: {
				'Content-Type': 'audio/wav',
				'Content-Length': fileBuffer.length.toString(),
			},
		});
	} catch (error) {
		console.error('Error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
