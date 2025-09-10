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
    
    console.log('Request data:')
    console.log('webhookUrl:', webhookUrl)
    console.log('connection:', connection)
    console.log('testData:', testData)

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
    } else if (connection.category === 'MOVE_DEAL') {
      // Для перемещения сделки нужен ID сделки из тестовых данных
      console.log('MOVE_DEAL testData:', testData)
      
      if (!testData.dealId && !testData.id) {
        console.log('Validation failed: no dealId or id found')
        return NextResponse.json(
          { error: 'Для перемещения сделки необходимо указать dealId или id в тестовых данных' },
          { status: 400 }
        )
      }
      
      // Применяем маппинг полей для MOVE_DEAL
      const mappedData = applyFieldMapping(testData, fieldMapping)
      
      // Устанавливаем ID сделки
      bitrixData.id = testData.dealId || testData.id
      
      // Добавляем все остальные поля из mappedData (кроме dealId)
      Object.keys(mappedData).forEach(key => {
        if (key !== 'dealId' && key !== 'id') {
          bitrixData[key] = mappedData[key]
        }
      })
      
      // Добавляем конфигурационные поля если они есть
      if (config.CATEGORY_ID) {
        bitrixData.CATEGORY_ID = config.CATEGORY_ID
      }
      if (config.STAGE_ID) {
        bitrixData.STAGE_ID = config.STAGE_ID
      }
    } else if (connection.category === 'MOVE_DEAL_BY_PHONE') {
      // Для перемещения сделки по телефону нужен номер телефона
      console.log('MOVE_DEAL_BY_PHONE testData:', testData)
      
      if (!testData.tel && !testData.phone) {
        console.log('Validation failed: no tel or phone found')
        return NextResponse.json(
          { error: 'Для перемещения сделки по телефону необходимо указать tel или phone в тестовых данных' },
          { status: 400 }
        )
      }
      
      // Применяем маппинг полей для MOVE_DEAL_BY_PHONE
      const mappedData = applyFieldMapping(testData, fieldMapping)
      
      // Добавляем все поля из mappedData (кроме tel и phone, так как они используются для поиска)
      Object.keys(mappedData).forEach(key => {
        if (key !== 'tel' && key !== 'phone') {
          bitrixData[key] = mappedData[key]
        }
      })
      
      // Добавляем конфигурационные поля если они есть
      if (config.CATEGORY_ID) {
        bitrixData.CATEGORY_ID = config.CATEGORY_ID
      }
      if (config.STAGE_ID) {
        bitrixData.STAGE_ID = config.STAGE_ID
      }
      
      // Ищем реальную сделку по номеру телефона
      const phoneNumber = testData.phone || testData.tel
      try {
        const searchResponse = await fetch(`${webhookUrl}crm.deal.list`, {
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
            select: ['ID', 'TITLE', 'PHONE', 'DATE_CREATE'],
            start: 0,
            limit: 1
          })
        })
        
        const searchResult = await searchResponse.json()
        
        if (searchResult.result && searchResult.result.length > 0) {
          bitrixData.id = searchResult.result[0].ID
        } else {
          return NextResponse.json(
            { error: `Сделка с номером телефона ${phoneNumber} не найдена` },
            { status: 404 }
          )
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Ошибка поиска сделки по телефону' },
          { status: 500 }
        )
      }
    }

    // Определяем метод API в зависимости от категории
    let apiMethod: string
    if (connection.category === 'CREATE_DEAL') {
      apiMethod = 'crm.deal.add'
    } else if (connection.category === 'CREATE_LEAD') {
      apiMethod = 'crm.lead.add'
    } else if (connection.category === 'MOVE_DEAL') {
      apiMethod = 'crm.deal.update'
    } else if (connection.category === 'MOVE_DEAL_BY_PHONE') {
      apiMethod = 'crm.deal.update'
    } else {
      return NextResponse.json(
        { error: 'Неподдерживаемая категория связи' },
        { status: 400 }
      )
    }

    // Отправляем запрос в Bitrix
    console.log('Sending to Bitrix:', `${webhookUrl}${apiMethod}`)
    console.log('Bitrix data:', bitrixData)
    
    // Для метода update нужно обернуть поля в объект fields
    const requestBody = apiMethod === 'crm.deal.update' 
      ? { id: bitrixData.id, fields: { ...bitrixData, id: undefined } }
      : { fields: bitrixData }
    
    console.log('Request body:', requestBody)
    
    const bitrixResponse = await fetch(`${webhookUrl}${apiMethod}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const bitrixResult = await bitrixResponse.json()
    console.log('Bitrix response:', bitrixResult)
    console.log('Bitrix response status:', bitrixResponse.status)

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