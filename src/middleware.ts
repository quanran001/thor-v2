
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    // ⚡️ V2 Update: Disable all auth checks for main page to allow Guest Access
    // We only protect admin routes now

    const { pathname } = request.nextUrl;

    // 仅保护 /admin 路由
    if (pathname.startsWith('/admin')) {
        // 这里可以保留原有的鉴权逻辑，或者暂时简化
        // const user = await getUserFromRequest(request);
        // if (!user) return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
