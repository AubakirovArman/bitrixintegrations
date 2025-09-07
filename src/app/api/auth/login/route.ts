import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      )
    }

    // Находим пользователя
    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Проверяем пароль
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Генерируем токен
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    })

  // Создаем ответ с токеном в cookie
    const response = NextResponse.json(
      {
        message: 'Успешный вход',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      { status: 200 }
    )

    // Устанавливаем cookie с токеном
    const isHttps = request.nextUrl.protocol === 'https:'
    const isProd = process.env.NODE_ENV === 'production'
    const secure = isProd ? isHttps : false
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 дней
    })

    return response
  } catch (error) {
    console.error('Ошибка входа:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}