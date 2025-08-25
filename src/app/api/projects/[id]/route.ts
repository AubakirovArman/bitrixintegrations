import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Проверяем токен
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Получаем проект
    const project = await db.project.findUnique({
      where: { 
        id: projectId,
        userId: decoded.userId // Проверяем, что проект принадлежит пользователю
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Ошибка получения проекта:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Проверяем токен
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    const { id: projectId } = await params
    const { name, description, status, bitrixWebhookUrl } = await request.json()

    // Проверяем, что проект существует и принадлежит пользователю
    const existingProject = await db.project.findUnique({
      where: { 
        id: projectId,
        userId: decoded.userId
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 })
    }

    // Обновляем проект
    const project = await db.project.update({
      where: { id: projectId },
      data: {
        name,
        description,
        status,
        bitrixWebhookUrl
      }
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Ошибка обновления проекта:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Проверяем токен
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Проверяем, что проект существует и принадлежит пользователю
    const existingProject = await db.project.findUnique({
      where: { 
        id: projectId,
        userId: decoded.userId
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 })
    }

    // Удаляем проект (связи удалятся автоматически благодаря onDelete: Cascade)
    await db.project.delete({
      where: { id: projectId }
    })

    return NextResponse.json({ message: 'Проект удален' })
  } catch (error) {
    console.error('Ошибка удаления проекта:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}