import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/server';

export const runtime = 'nodejs';

export async function GET() {
	try {
		await getDb();
		return NextResponse.json({ status: 'ok' });
	} catch (error) {
		console.error('Failed to initialize database:', error);
		return NextResponse.json({ error: 'Database initialization failed' }, { status: 500 });
	}
}
