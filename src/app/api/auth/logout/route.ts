import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json(
    { message: 'Успешный выход' },
    { status: 200 }
  )

  // Удаляем cookie с токеном
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })

  return response
}