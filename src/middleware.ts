import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Публичные роуты, которые не требуют авторизации
  const publicRoutes = ['/', '/login', '/register', '/api/auth/login', '/api/auth/register']
  
  // Админские роуты
  const adminRoutes = ['/admin', '/api/admin']
  
  // Защищенные роуты
  const protectedRoutes = ['/dashboard', '/api/projects']

  // Если это публичный роут, пропускаем
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Получаем токен из cookies
  const token = request.cookies.get('auth-token')?.value

  // Если нет токена и это защищенный роут
  if (!token && (protectedRoutes.some(route => pathname.startsWith(route)) || adminRoutes.some(route => pathname.startsWith(route)))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Если есть токен, проверяем его
  if (token) {
    const decoded = verifyToken(token)
    
    if (!decoded) {
      // Токен недействителен
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
      }
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }

    // Проверяем доступ к админским роутам
    if (adminRoutes.some(route => pathname.startsWith(route)) && decoded.role !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Если пользователь авторизован и пытается зайти на страницы входа/регистрации
    if (pathname === '/login' || pathname === '/register') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}