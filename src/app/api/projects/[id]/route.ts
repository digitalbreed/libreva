import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { rm } from 'fs/promises';
import path from 'path';

// Specify Node.js runtime
export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		const [project] = await query<{
			id: string;
			title: string;
			status: 'active' | 'archived' | 'deleted';
			created_at: string;
			updated_at: string;
		}>('SELECT * FROM projects WHERE id = ? AND status = ?', [id, 'active']);

		if (!project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		return NextResponse.json(project);
	} catch (error) {
		console.error('Error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const updates = await request.json();
		const { title } = updates;

		if (!title?.trim()) {
			return NextResponse.json({ error: 'Project title is required' }, { status: 400 });
		}

		const now = new Date().toISOString();
		const result = await run(
			'UPDATE projects SET title = ?, updated_at = ? WHERE id = ? AND status = ?',
			[title.trim(), now, id, 'active']
		);

		if (result.changes === 0) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		const [project] = await query<{
			id: string;
			title: string;
			status: 'active' | 'archived' | 'deleted';
			created_at: string;
			updated_at: string;
		}>('SELECT * FROM projects WHERE id = ?', [id]);

		return NextResponse.json(project);
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

		// Delete the entire project directory which contains all outputs and waveforms
		const outputsDir = process.env.OUTPUTS_DIR || path.join(process.cwd(), 'data', 'outputs');
		const projectDir = path.join(outputsDir, id);

		try {
			await rm(projectDir, { recursive: true, force: true });
		} catch (error) {
			console.warn(
				`Project directory not found or could not be deleted: ${projectDir}`,
				error
			);
		}

		// Delete project from database (outputs will be deleted via CASCADE)
		await run('DELETE FROM projects WHERE id = ?', [id]);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting project:', error);
		return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
	}
}
