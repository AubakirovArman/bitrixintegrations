import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Получаем токен из cookies
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем токен
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const webhookUrl = searchParams.get('webhookUrl')
    const entityType = searchParams.get('entityType') // 'lead' или 'deal'

    if (!webhookUrl || !entityType) {
      return NextResponse.json(
        { error: 'webhookUrl and entityType are required' },
        { status: 400 }
      )
    }

    // Определяем метод API в зависимости от типа сущности
    const apiMethod = entityType === 'lead' ? 'crm.lead.fields' : 'crm.deal.fields'
    
    // Запрос к Bitrix API для получения полей
    const bitrixResponse = await fetch(`${webhookUrl}${apiMethod}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!bitrixResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch fields from Bitrix' },
        { status: 500 }
      )
    }

    const data = await bitrixResponse.json()

    if (!data.result) {
      return NextResponse.json(
        { error: 'Invalid response from Bitrix API' },
        { status: 500 }
      )
    }

    // Преобразуем поля в удобный формат
    const fields = Object.entries(data.result).map(([key, field]: [string, any]) => ({
      id: key,
      title: field.title || key,
      type: field.type || 'string',
      required: field.isRequired || false,
      multiple: field.isMultiple || false,
      listItems: field.items || null // Для списковых полей
    }))

    // Фильтруем только основные поля, исключаем системные
    const filteredFields = fields.filter(field => 
      !field.id.startsWith('UF_') || // Пользовательские поля включаем
      ['TITLE', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'PHONE', 'EMAIL', 'COMPANY_TITLE', 'OPPORTUNITY', 'CURRENCY_ID', 'SOURCE_ID', 'STATUS_ID'].includes(field.id)
    )

    return NextResponse.json({ fields: filteredFields })
  } catch (error) {
    console.error('Error fetching Bitrix fields:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}