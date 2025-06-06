import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;

		// Get output details from database
		const [output] = await query<{ project_id: string }>(
			'SELECT project_id FROM outputs WHERE id = ?',
			[id]
		);

		if (!output) {
			return NextResponse.json({ error: 'Output not found' }, { status: 404 });
		}

		// Delete physical files
		const outputsDir = process.env.OUTPUTS_DIR || path.join(process.cwd(), 'data', 'outputs');
		const projectDir = path.join(outputsDir, output.project_id);

		const audioPath = path.join(projectDir, `${id}.wav`);
		const waveformPath = path.join(projectDir, `${id}.png`);

		// Delete files if they exist
		try {
			await unlink(audioPath);
		} catch {
			console.warn(`Audio file not found: ${audioPath}`);
		}

		try {
			await unlink(waveformPath);
		} catch {
			console.warn(`Waveform file not found: ${waveformPath}`);
		}

		// Delete from database
		await run('DELETE FROM outputs WHERE id = ?', [id]);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting output:', error);
		return NextResponse.json({ error: 'Failed to delete output' }, { status: 500 });
	}
}
