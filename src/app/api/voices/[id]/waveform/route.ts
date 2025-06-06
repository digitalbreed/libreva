import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { join } from 'path';
import { readFile } from 'fs/promises';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		const [voice] = await query<{ id: string }>('SELECT id FROM voices WHERE id = ?', [id]);

		if (!voice) {
			return new NextResponse('Voice not found', { status: 404 });
		}

		const voicesDir = process.env.VOICES_DIR || join(process.cwd(), 'data', 'voices');
		const waveformPath = join(voicesDir, `${id}.png`);
		const imageBuffer = await readFile(waveformPath);

		return new NextResponse(imageBuffer, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=31536000',
			},
		});
	} catch (error) {
		console.error('Error serving waveform:', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
