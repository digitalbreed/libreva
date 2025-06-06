import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Specify Node.js runtime
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '10');
		const offset = (page - 1) * limit;

		const projects = await query<{
			id: string;
			title: string;
			status: 'active' | 'archived' | 'deleted';
			created_at: string;
			updated_at: string;
		}>(
			`SELECT * FROM projects 
			WHERE status = 'active' 
			ORDER BY created_at DESC
			LIMIT ? OFFSET ?`,
			[limit, offset]
		);

		// If no pagination parameters are provided, return just the projects array for backward compatibility
		if (!searchParams.has('page') && !searchParams.has('limit')) {
			return NextResponse.json(projects);
		}

		// Get total count for pagination
		const [{ total }] = await query<{ total: number }>(
			`SELECT COUNT(*) as total FROM projects WHERE status = 'active'`
		);

		return NextResponse.json({
			projects,
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

export async function POST(request: NextRequest) {
	try {
		const { title } = await request.json();

		if (!title?.trim()) {
			return NextResponse.json({ error: 'Project title is required' }, { status: 400 });
		}

		const id = uuidv4();
		const now = new Date().toISOString();

		await run(
			`INSERT INTO projects (id, title, status, created_at, updated_at)
			VALUES (?, ?, 'active', ?, ?)`,
			[id, title.trim(), now, now]
		);

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
