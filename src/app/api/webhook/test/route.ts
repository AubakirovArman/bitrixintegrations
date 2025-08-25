import { NextRequest, NextResponse } from 'next/server'

interface FieldMappingRule {
  sourceField: string
  targetField: string
}

// Функция для получения значения из вложенного объекта по пути
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

// Функция для применения маппинга полей
function applyFieldMapping(data: any, fieldMapping: FieldMappingRule[]): any {
  const mappedData: any = {}
  
  fieldMapping.forEach(rule => {
    const value = getNestedValue(data, rule.sourceField)
    if (value !== undefined) {
      mappedData[rule.targetField] = value
    }
  })
  
  return mappedData
}

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, connection, testData } = await request.json()

    if (!webhookUrl || !connection || !testData) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные параметры' },
        { status: 400 }
      )
    }

    // Парсим маппинг полей
    const fieldMapping: FieldMappingRule[] = connection.fieldMapping 
      ? JSON.parse(connection.fieldMapping) 
      : []

    // Применяем маппинг к тестовым данным
    const mappedData = applyFieldMapping(testData, fieldMapping)

    // Парсим конфигурацию
    const config = JSON.parse(connection.config)

    // Подготавливаем данные для отправки в Bitrix
    let bitrixData: any = {
      ...mappedData
    }

    // Добавляем специфичные для категории поля
    if (connection.category === 'CREATE_DEAL') {
      if (config.CATEGORY_ID) {
        bitrixData.CATEGORY_ID = config.CATEGORY_ID
      }
      if (config.STAGE_ID) {
        bitrixData.STAGE_ID = config.STAGE_ID
      }
    } else if (connection.category === 'CREATE_LEAD') {
      if (config.STATUS_ID) {
        bitrixData.STATUS_ID = config.STATUS_ID
      }
    }

    // Определяем метод API в зависимости от категории
    const apiMethod = connection.category === 'CREATE_DEAL' 
      ? 'crm.deal.add' 
      : 'crm.lead.add'

    // Отправляем запрос в Bitrix
    const bitrixResponse = await fetch(`${webhookUrl}${apiMethod}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: bitrixData
      })
    })

    const bitrixResult = await bitrixResponse.json()

    if (!bitrixResponse.ok || bitrixResult.error) {
      return NextResponse.json(
        { 
          error: 'Ошибка создания карточки в Bitrix',
          details: bitrixResult.error || bitrixResult
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      id: bitrixResult.result,
      mappedData,
      originalData: testData
    })

  } catch (error) {
    console.error('Ошибка тестирования webhook:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}