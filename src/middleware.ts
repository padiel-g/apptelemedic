import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Note: We avoid importing from @/lib/db or @/lib/auth using bcrypt because edge runtime does not support better-sqlite3 or bcrypt natively.
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/', '/login', '/register', '/api/auth/login', '/api/auth/register', '/api/health-data'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  if (isPublicRoute || pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    const userRole = payload.role as string;
    
    // Role based exact guarding
    if (pathname.startsWith('/patient') && userRole !== 'patient') {
      return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }
    if (pathname.startsWith('/doctor') && userRole !== 'doctor') {
      return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', userRole);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Middleware JWT verification error:', error);
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
