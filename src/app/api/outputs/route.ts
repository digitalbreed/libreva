import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '10');
		const offset = (page - 1) * limit;

		const outputs = await query<{
			id: string;
			text: string;
			voice_id: string;
			voice_name: string;
			temperature: number;
			exaggeration: number;
			created_at: string;
			project_id: string;
			project_title: string;
		}>(
			`SELECT o.id, o.text, o.voice_id, v.name as voice_name, 
            o.temperature, o.exaggeration, o.created_at,
            o.project_id, p.title as project_title
            FROM outputs o
            LEFT JOIN voices v ON o.voice_id = v.id
            LEFT JOIN projects p ON o.project_id = p.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?`,
			[limit, offset]
		);

		// Get total count for pagination
		const [{ total }] = await query<{ total: number }>(`SELECT COUNT(*) as total FROM outputs`);

		return NextResponse.json({
			outputs,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error('Error fetching outputs:', error);
		return NextResponse.json({ error: 'Failed to fetch outputs' }, { status: 500 });
	}
}
