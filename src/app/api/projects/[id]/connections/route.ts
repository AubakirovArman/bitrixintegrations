import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { randomBytes } from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: projectId } = await params

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

    // Получаем все связи проекта
    const connections = await (db as any).connection.findMany({
      where: {
        projectId: projectId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ connections })
  } catch (error) {
    console.error('Ошибка получения связей:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: projectId } = await params
  const body = await request.json()
  const { name, description, category, funnelId, stageId, config, fieldMapping } = body

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Название и категория связи обязательны' },
        { status: 400 }
      )
    }

    // Проверяем валидность категории
    if (!['CREATE_DEAL', 'CREATE_LEAD'].includes(category)) {
      return NextResponse.json(
        { error: 'Недопустимая категория. Доступны: CREATE_DEAL, CREATE_LEAD' },
        { status: 400 }
      )
    }

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

    // Генерируем уникальный webhook URL
    const webhookToken = randomBytes(32).toString('hex')
    const webhookUrl = `/api/webhook/bitrix/${webhookToken}`

    // Создаем новую связь
    const newConnection = await (db as any).connection.create({
      data: {
        name,
        description,
        type: 'BITRIX',
        category,
        funnelId: funnelId || null,
        stageId: stageId || null,
        config: JSON.stringify(config || {}),
        fieldMapping: typeof fieldMapping === 'string' ? fieldMapping : (fieldMapping ? JSON.stringify(fieldMapping) : null),
        webhookUrl,
        projectId
      }
    })

    return NextResponse.json(
      { message: 'Связь создана успешно', connection: newConnection },
      { status: 201 }
    )
  } catch (error) {
    console.error('Ошибка создания связи:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}