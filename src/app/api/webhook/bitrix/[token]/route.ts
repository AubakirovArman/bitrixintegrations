import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Интерфейс для правила маппинга полей
interface FieldMappingRule {
  sourceField: string
  targetField: string
}

// Функция для применения маппинга полей
function applyFieldMapping(payload: any, fieldMapping: FieldMappingRule[]): any {
  const mappedData: any = {}
  
  fieldMapping.forEach(rule => {
    const value = getNestedValue(payload, rule.sourceField)
    if (value !== undefined) {
      mappedData[rule.targetField] = value
    }
  })
  
  return mappedData
}

// Функция для получения значения по вложенному пути (например, "user.name")
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    // Находим связь по webhook URL
    const webhookUrl = `/api/webhook/bitrix/${token}`
    const connection = await db.connection.findUnique({
      where: {
        webhookUrl: webhookUrl
      },
      include: {
        project: true
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Webhook не найден' },
        { status: 404 }
      )
    }

    if (connection.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Связь неактивна' },
        { status: 400 }
      )
    }

    // Получаем данные из запроса
    const payload = await request.json()
    
    // Логируем входящий запрос для отладки
    console.log('Bitrix webhook received:', {
      connectionId: connection.id,
      category: connection.category,
      payload
    })

    // Обрабатываем запрос в зависимости от категории
    let result
    switch (connection.category) {
      case 'CREATE_DEAL':
        result = await processDealCreation(connection, payload)
        break
      case 'CREATE_LEAD':
        result = await processLeadCreation(connection, payload)
        break
      case 'MOVE_DEAL':
        result = await processDealMove(connection, payload)
        break
      case 'MOVE_DEAL_BY_PHONE':
        result = await processDealMoveByPhone(connection, payload)
        break
      default:
        return NextResponse.json(
          { error: 'Неподдерживаемая категория' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook обработан успешно',
      result
    })

  } catch (error) {
    console.error('Ошибка обработки Bitrix webhook:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// Функция для обработки создания сделки
async function processDealCreation(connection: any, payload: any) {
  try {
    // Получаем bitrixUrl из проекта
    const bitrixUrl = connection.project?.bitrixWebhookUrl
    if (!bitrixUrl) {
      throw new Error('Bitrix URL не настроен в проекте')
    }
    
    // Парсим маппинг полей из связи
    const fieldMapping: FieldMappingRule[] = JSON.parse(connection.fieldMapping || '[]')
    console.log('Field mapping rules:', fieldMapping)
    
    // Применяем маппинг полей
    const mappedData = applyFieldMapping(payload, fieldMapping)
    console.log('Mapped data:', mappedData)
    
    // Добавляем обязательные поля для сделки из настроек связи
    const dealData = {
      ...mappedData,
      CATEGORY_ID: connection.funnelId || '0',
      STAGE_ID: connection.stageId || 'NEW'
    }
    
    // Проверяем, является ли это тестовой конфигурацией
    if (bitrixUrl === 'https://your-bitrix-domain.bitrix24.ru') {
      // Возвращаем мок-ответ для тестирования
      const mockId = Math.floor(Math.random() * 10000) + 1000
      console.log('Mock Bitrix API call:', {
        url: `${bitrixUrl}/crm.deal.add.json`,
        dealData
      })
      
      return {
        type: 'deal',
        action: 'created',
        bitrixId: mockId,
        mappedData,
        originalPayload: payload,
        note: 'Тестовый режим - сделка не была создана в реальном Bitrix'
      }
    }
    
    // Отправляем запрос в Bitrix API для создания сделки
    const bitrixResponse = await fetch(`${bitrixUrl}/crm.deal.add.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: dealData
      })
    })
    
    const result = await bitrixResponse.json()
    
    if (!bitrixResponse.ok || result.error) {
      throw new Error(`Bitrix API error: ${result.error_description || result.error || 'Unknown error'}`)
    }
    
    return {
      type: 'deal',
      action: 'created',
      bitrixId: result.result,
      mappedData,
      originalPayload: payload
    }
  } catch (error) {
    console.error('Error creating deal in Bitrix:', error)
    throw error
  }
}

// Функция для обработки создания лида
async function processLeadCreation(connection: any, payload: any) {
  try {
    // Получаем bitrixUrl из проекта
    const bitrixUrl = connection.project?.bitrixWebhookUrl
    if (!bitrixUrl) {
      throw new Error('Bitrix URL не настроен в проекте')
    }
    
    // Парсим маппинг полей из связи
    const fieldMapping: FieldMappingRule[] = JSON.parse(connection.fieldMapping || '[]')
    
    // Применяем маппинг полей
    const mappedData = applyFieldMapping(payload, fieldMapping)
    
    // Добавляем обязательные поля для лида из настроек связи
    const leadData = {
      ...mappedData,
      STATUS_ID: connection.stageId || 'NEW'
    }
    
    // Проверяем, является ли это тестовой конфигурацией
    if (bitrixUrl === 'https://your-bitrix-domain.bitrix24.ru') {
      // Возвращаем мок-ответ для тестирования
      const mockId = Math.floor(Math.random() * 10000) + 1000
      console.log('Mock Bitrix API call:', {
        url: `${bitrixUrl}/crm.lead.add.json`,
        leadData
      })
      
      return {
        type: 'lead',
        action: 'created',
        bitrixId: mockId,
        mappedData,
        originalPayload: payload,
        note: 'Тестовый режим - лид не был создан в реальном Bitrix'
      }
    }
    
    // Отправляем запрос в Bitrix API для создания лида
    const bitrixResponse = await fetch(`${bitrixUrl}/crm.lead.add.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: leadData
      })
    })
    
    const result = await bitrixResponse.json()
    
    if (!bitrixResponse.ok || result.error) {
      throw new Error(`Bitrix API error: ${result.error_description || result.error || 'Unknown error'}`)
    }
    
    return {
      type: 'lead',
      action: 'created',
      bitrixId: result.result,
      mappedData,
      originalPayload: payload
    }
  } catch (error) {
    console.error('Error creating lead in Bitrix:', error)
    throw error
  }
}

// Функция для обработки перемещения сделки
async function processDealMove(connection: any, payload: any) {
  try {
    // Получаем bitrixUrl из проекта
    const bitrixUrl = connection.project?.bitrixWebhookUrl
    if (!bitrixUrl) {
      throw new Error('Bitrix URL не настроен в проекте')
    }
    
    // Парсим маппинг полей из связи
    const fieldMapping: FieldMappingRule[] = JSON.parse(connection.fieldMapping || '[]')
    console.log('Field mapping rules for move:', fieldMapping)
    
    // Применяем маппинг полей
    const mappedData = applyFieldMapping(payload, fieldMapping)
    console.log('Mapped data for move:', mappedData)
    
    // Получаем ID сделки из входящих данных
    const dealId = mappedData.dealId || mappedData.id || payload.dealId || payload.id
    if (!dealId) {
      throw new Error('ID сделки не найден в входящих данных')
    }
    
    // Подготавливаем данные для обновления сделки
    const updateData: any = {}
    
    // Добавляем все поля из mappedData (кроме dealId и id)
    Object.keys(mappedData).forEach(key => {
      if (key !== 'dealId' && key !== 'id') {
        updateData[key] = mappedData[key]
      }
    })
    
    // Парсим конфигурацию связи для получения дополнительных настроек
    const config = JSON.parse(connection.config || '{}')
    
    // Устанавливаем новую воронку и этап из настроек связи
    if (config.CATEGORY_ID) {
      updateData.CATEGORY_ID = config.CATEGORY_ID
    }
    if (config.STAGE_ID) {
      updateData.STAGE_ID = config.STAGE_ID
    }
    
    // Проверяем, является ли это тестовой конфигурацией
    if (bitrixUrl === 'https://your-bitrix-domain.bitrix24.ru') {
      // Возвращаем мок-ответ для тестирования
      console.log('Mock Bitrix API call for move:', {
        url: `${bitrixUrl}/crm.deal.update.json`,
        dealId,
        updateData
      })
      
      return {
        type: 'deal',
        action: 'moved',
        bitrixId: dealId,
        updateData,
        originalPayload: payload,
        note: 'Тестовый режим - сделка не была перемещена в реальном Bitrix'
      }
    }
    
    // Отправляем запрос в Bitrix API для обновления сделки
    const bitrixResponse = await fetch(`${bitrixUrl}/crm.deal.update.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: dealId,
        fields: updateData
      })
    })
    
    const result = await bitrixResponse.json()
    
    if (!bitrixResponse.ok || result.error) {
      throw new Error(`Bitrix API error: ${result.error_description || result.error || 'Unknown error'}`)
    }
    
    return {
      type: 'deal',
      action: 'moved',
      bitrixId: dealId,
      updateData,
      originalPayload: payload,
      success: result.result
    }
  } catch (error) {
    console.error('Error moving deal in Bitrix:', error)
    throw error
  }
}

// Функция для обработки перемещения сделки по номеру телефона
async function processDealMoveByPhone(connection: any, payload: any) {
  try {
    // Получаем bitrixUrl из проекта
    const bitrixUrl = connection.project?.bitrixWebhookUrl
    if (!bitrixUrl) {
      throw new Error('Bitrix URL не настроен в проекте')
    }
    
    // Парсим маппинг полей из связи
    const fieldMapping: FieldMappingRule[] = JSON.parse(connection.fieldMapping || '[]')
    console.log('Field mapping rules for move by phone:', fieldMapping)
    
    // Применяем маппинг полей
    const mappedData = applyFieldMapping(payload, fieldMapping)
    console.log('Mapped data for move by phone:', mappedData)
    
    // Получаем номер телефона из входящих данных
    const phoneNumber = mappedData.phone || mappedData.tel || payload.phone || payload.tel
    if (!phoneNumber) {
      throw new Error('Номер телефона не найден в входящих данных')
    }
    
    // Подготавливаем данные для обновления сделки
    const updateData: any = {}
    
    // Добавляем все поля из mappedData (кроме phone и tel)
    Object.keys(mappedData).forEach(key => {
      if (key !== 'phone' && key !== 'tel') {
        updateData[key] = mappedData[key]
      }
    })
    
    // Парсим конфигурацию связи для получения дополнительных настроек
    const config = JSON.parse(connection.config || '{}')
    
    // Устанавливаем новую воронку и этап из настроек связи
    if (config.CATEGORY_ID) {
      updateData.CATEGORY_ID = config.CATEGORY_ID
    }
    if (config.STAGE_ID) {
      updateData.STAGE_ID = config.STAGE_ID
    }
    
    // Проверяем, является ли это тестовой конфигурацией
    if (bitrixUrl === 'https://your-bitrix-domain.bitrix24.ru') {
      // Возвращаем мок-ответ для тестирования
      const mockDealId = Math.floor(Math.random() * 10000) + 1000
      console.log('Mock Bitrix API call for move by phone:', {
        phoneNumber,
        foundDealId: mockDealId,
        updateData
      })
      
      return {
        type: 'deal',
        action: 'moved_by_phone',
        phoneNumber,
        bitrixId: mockDealId,
        updateData,
        originalPayload: payload,
        note: 'Тестовый режим - поиск и перемещение сделки по телефону не выполнены в реальном Bitrix'
      }
    }
    
    // Ищем сделки по номеру телефона в Bitrix
    const searchResponse = await fetch(`${bitrixUrl}/crm.deal.list.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          'PHONE': phoneNumber
        },
        order: {
          'ID': 'DESC'
        },
        select: ['ID', 'TITLE', 'PHONE', 'DATE_CREATE']
      })
    })

    const searchResult = await searchResponse.json()
    
    if (!searchResponse.ok || searchResult.error) {
      throw new Error(`Bitrix API search error: ${searchResult.error_description || searchResult.error || 'Unknown error'}`)
    }

    // Проверяем, найдены ли сделки
    if (!searchResult.result || searchResult.result.length === 0) {
      throw new Error(`Сделка с номером телефона ${phoneNumber} не найдена`)
    }

    // Берем самую последнюю сделку (первую в отсортированном по ID списке)
    const latestDeal = searchResult.result[0]
    const dealId = latestDeal.ID
    
    // Отправляем запрос в Bitrix API для обновления сделки
    const bitrixResponse = await fetch(`${bitrixUrl}/crm.deal.update.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: dealId,
        fields: updateData
      })
    })

    const result = await bitrixResponse.json()
    
    if (!bitrixResponse.ok || result.error) {
      throw new Error(`Bitrix API error: ${result.error_description || result.error || 'Unknown error'}`)
    }

    return {
      type: 'deal',
      action: 'moved_by_phone',
      phoneNumber,
      bitrixId: dealId,
      updateData,
      originalPayload: payload,
      foundDeal: latestDeal,
      success: result.result
    }
  } catch (error) {
    console.error('Error moving deal by phone in Bitrix:', error)
    throw error
  }
}

// GET метод для проверки доступности webhook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    const webhookUrl = `/api/webhook/bitrix/${token}`
    const connection = await db.connection.findUnique({
      where: {
        webhookUrl: webhookUrl
      },
      select: {
        id: true,
        name: true,
        category: true,
        status: true
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Webhook не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Webhook активен',
      connection: {
        id: connection.id,
        name: connection.name,
        category: connection.category,
        status: connection.status
      }
    })

  } catch (error) {
    console.error('Ошибка проверки webhook:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}