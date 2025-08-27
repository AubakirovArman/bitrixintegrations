import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, hashPassword } from '@/lib/auth'

// PATCH: обновить пользователя (имя, роль, пароль)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })

    const { id } = await params
    const { name, role, password } = await request.json()

    const user = await db.user.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

    // Если меняем роль ADMIN -> USER, проверяем что не последний админ
    if (user.role === 'ADMIN' && role === 'USER') {
      const adminCount = await db.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Нельзя понизить последнего админа' }, { status: 400 })
      }
    }

    const data: any = {}
    if (name !== undefined) data.name = name || null
    if (role && ['USER', 'ADMIN'].includes(role)) data.role = role
    if (password) {
      if (password.length < 6) return NextResponse.json({ error: 'Пароль минимум 6 символов' }, { status: 400 })
      data.password = await hashPassword(password)
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    })

    return NextResponse.json({ message: 'Пользователь обновлён', user: updated })
  } catch (error) {
    console.error('Ошибка обновления пользователя:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

// DELETE: удалить пользователя
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'ADMIN') return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })

    const { id } = await params

    const user = await db.user.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

    // Нельзя удалить себя (опционально)
    if (decoded.userId === id) {
      return NextResponse.json({ error: 'Нельзя удалить свою учетную запись' }, { status: 400 })
    }

    // Нельзя удалить последнего админа
    if (user.role === 'ADMIN') {
      const adminCount = await db.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Нельзя удалить последнего админа' }, { status: 400 })
      }
    }

    await db.user.delete({ where: { id } })
    return NextResponse.json({ message: 'Пользователь удалён' })
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}