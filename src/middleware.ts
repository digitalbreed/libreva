import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
	// Only run on API routes
	if (!request.nextUrl.pathname.startsWith('/api')) {
		return NextResponse.next();
	}

	return NextResponse.next();
}

// Configure the middleware to run only on API routes
export const config = {
	matcher: '/api/:path*',
};
