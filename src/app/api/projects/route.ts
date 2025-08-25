import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// Получить все проекты пользователя
export async function GET(request: NextRequest) {
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

    const projects = await db.project.findMany({
      where: {
        userId: decoded.userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Ошибка получения проектов:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// Создать новый проект
export async function POST(request: NextRequest) {
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

    const { name, description, bitrixWebhookUrl } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Название проекта обязательно' },
        { status: 400 }
      )
    }

    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        bitrixWebhookUrl: bitrixWebhookUrl || null,
        userId: decoded.userId
      }
    })

    return NextResponse.json(
      { message: 'Проект успешно создан', project },
      { status: 201 }
    )
  } catch (error) {
    console.error('Ошибка создания проекта:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}