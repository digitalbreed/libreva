import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
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
		}>(
			`SELECT o.id, o.text, o.voice_id, v.name as voice_name, 
       o.temperature, o.exaggeration, o.created_at
       FROM outputs o
       LEFT JOIN voices v ON o.voice_id = v.id
       WHERE o.project_id = ?
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
			[id, limit, offset]
		);

		// Get total count for pagination
		const [{ total }] = await query<{ total: number }>(
			`SELECT COUNT(*) as total FROM outputs WHERE project_id = ?`,
			[id]
		);

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
