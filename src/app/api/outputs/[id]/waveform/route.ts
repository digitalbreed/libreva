import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		const [output] = await query<{ project_id: string }>(
			'SELECT project_id FROM outputs WHERE id = ?',
			[id]
		);

		if (!output) {
			return NextResponse.json({ error: 'Output not found' }, { status: 404 });
		}

		const outputsDir = process.env.OUTPUTS_DIR || path.join(process.cwd(), 'data', 'outputs');
		const projectDir = path.join(outputsDir, output.project_id);
		const filePath = path.join(projectDir, `${id}.png`);
		const fileBuffer = await readFile(filePath);

		return new NextResponse(fileBuffer, {
			headers: {
				'Content-Type': 'image/png',
				'Content-Length': fileBuffer.length.toString(),
			},
		});
	} catch (error) {
		console.error('Error serving waveform image:', error);
		return NextResponse.json({ error: 'Failed to serve waveform image' }, { status: 500 });
	}
}
