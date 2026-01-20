
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/rbac';

// 🛡️ 路由保护配置
const PROTECTED_ROUTES = ['/dashboard', '/profile', '/sops'];
const ADMIN_ROUTES = ['/admin'];
const AUTH_ROUTES = ['/login', '/register'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. 获取当前用户
    const user = await getUserFromRequest(request);
    const isAuth = !!user;

    // 2. 处理 Auth 路由 (如已登录则跳到 Dashboard)
    if (isAuth && AUTH_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 3. 处理管理员路由
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
        if (!isAuth) {
            const url = new URL('/login', request.url);
            url.searchParams.set('from', pathname);
            return NextResponse.redirect(url);
        }
        // 二次检查管理员权限
        if (!isAdmin(user.userId)) {
            // 已登录但无权限 -> 403 或首页
            return NextResponse.redirect(new URL('/dashboard', request.url)); // 或者显示无权限页
        }
    }

    // 4. 处理一般保护路由
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
        if (!isAuth) {
            const url = new URL('/login', request.url);
            url.searchParams.set('from', pathname);
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * 匹配所有路径除了:
         * - api/auth (允许登录接口)
         * - _next/static (静态文件)
         * - _next/image (图片优化)
         * - favicon.ico
         * - images/
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico|images).*)',
    ],
};
