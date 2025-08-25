import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Недействительный токен' },
        { status: 401 }
      )
    }

    const { id: projectId, connectionId } = await params

    // Проверяем, что проект принадлежит пользователю или пользователь - админ
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { user: true }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      )
    }

    if (project.userId !== decoded.userId && decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    // Получаем связь
    const connection = await db.connection.findUnique({
      where: {
        id: connectionId,
        projectId: projectId
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Связь не найдена' },
        { status: 404 }
      )
    }

    return NextResponse.json({ connection })
  } catch (error) {
    console.error('Ошибка получения связи:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Недействительный токен' },
        { status: 401 }
      )
    }

    const { id: projectId, connectionId } = await params
    const { name, description, type, config, status, fieldMapping } = await request.json()

    // Проверяем, что проект принадлежит пользователю или пользователь - админ
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { user: true }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      )
    }

    if (project.userId !== decoded.userId && decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    // Проверяем, что связь существует
    const existingConnection = await db.connection.findUnique({
      where: {
        id: connectionId,
        projectId: projectId
      }
    })

    if (!existingConnection) {
      return NextResponse.json({ error: 'Связь не найдена' }, { status: 404 })
    }

    // Обновляем связь
    const connection = await db.connection.update({
      where: {
        id: connectionId
      },
      data: {
        name,
        description,
        type,
        config: JSON.stringify(config),
        status,
        ...(fieldMapping !== undefined && { fieldMapping })
      }
    })

    return NextResponse.json(
      { message: 'Связь обновлена успешно', connection }
    )
  } catch (error) {
    console.error('Ошибка обновления связи:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Недействительный токен' },
        { status: 401 }
      )
    }

    const { id: projectId, connectionId } = await params

    // Проверяем, что проект принадлежит пользователю или пользователь - админ
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { user: true }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      )
    }

    if (project.userId !== decoded.userId && decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    // Проверяем, что связь существует
    const existingConnection = await db.connection.findUnique({
      where: {
        id: connectionId,
        projectId: projectId
      }
    })

    if (!existingConnection) {
      return NextResponse.json({ error: 'Связь не найдена' }, { status: 404 })
    }

    // Удаляем связь
    await db.connection.delete({
      where: {
        id: connectionId
      }
    })

    return NextResponse.json(
      { message: 'Связь удалена успешно' }
    )
  } catch (error) {
    console.error('Ошибка удаления связи:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}