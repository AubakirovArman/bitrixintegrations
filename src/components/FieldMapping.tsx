'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus } from 'lucide-react'

interface BitrixField {
  id: string
  title: string
  type: string
  required: boolean
  multiple: boolean
  listItems?: any
}

interface FieldMappingRule {
  sourceField: string
  targetField: string
}

interface FieldMappingProps {
  webhookUrl: string
  category: 'CREATE_DEAL' | 'CREATE_LEAD'
  value: FieldMappingRule[]
  onChange: (mapping: FieldMappingRule[]) => void
  jsonExample?: string
}

export default function FieldMapping({ 
  webhookUrl, 
  category, 
  value, 
  onChange, 
  jsonExample 
}: FieldMappingProps) {
  const [bitrixFields, setBitrixFields] = useState<BitrixField[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jsonFields, setJsonFields] = useState<string[]>([])

  // Извлекаем поля из примера JSON
  useEffect(() => {
    if (jsonExample) {
      try {
        const parsed = JSON.parse(jsonExample)
        const fields = extractJsonFields(parsed)
        setJsonFields(fields)
      } catch (err) {
        console.error('Invalid JSON example:', err)
        setJsonFields([])
      }
    }
  }, [jsonExample])

  // Загружаем поля Bitrix при изменении категории или webhook URL
  useEffect(() => {
    if (webhookUrl && category) {
      fetchBitrixFields()
    }
  }, [webhookUrl, category])

  const extractJsonFields = (obj: any, prefix = ''): string[] => {
    const fields: string[] = []
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          // Рекурсивно обрабатываем вложенные объекты
          fields.push(...extractJsonFields(obj[key], fullKey))
        } else {
          // Добавляем простые поля
          fields.push(fullKey)
        }
      }
    }
    
    return fields
  }

  const fetchBitrixFields = async () => {
    try {
      setLoading(true)
      setError('')
      
      const entityType = category === 'CREATE_DEAL' ? 'deal' : 'lead'
      const response = await fetch(`/api/bitrix/fields?webhookUrl=${encodeURIComponent(webhookUrl)}&entityType=${entityType}`)
      
      if (response.ok) {
        const data = await response.json()
        setBitrixFields(data.fields)
      } else {
        setError('Ошибка загрузки полей Bitrix')
      }
    } catch (err) {
      setError('Ошибка загрузки полей Bitrix')
    } finally {
      setLoading(false)
    }
  }

  const addMappingRule = () => {
    onChange([...value, { sourceField: '', targetField: '' }])
  }

  const removeMappingRule = (index: number) => {
    const newMapping = value.filter((_, i) => i !== index)
    onChange(newMapping)
  }

  const updateMappingRule = (index: number, field: keyof FieldMappingRule, newValue: string) => {
    const newMapping = [...value]
    newMapping[index] = { ...newMapping[index], [field]: newValue }
    onChange(newMapping)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Маппинг полей</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Загрузка полей Bitrix...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Маппинг полей</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
          <Button onClick={fetchBitrixFields} className="mt-2" size="sm">
            Повторить
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Маппинг полей</CardTitle>
        <p className="text-sm text-gray-600">
          Настройте соответствие между полями входящего JSON и полями {category === 'CREATE_DEAL' ? 'сделки' : 'лида'} в Bitrix
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {value.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Нет настроенных правил маппинга. Добавьте первое правило.
          </p>
        )}
        
        {value.map((rule, index) => (
          <div key={index} className="flex items-end gap-2 p-3 border rounded-lg">
            <div className="flex-1">
              <Label htmlFor={`json-field-${index}`}>Поле JSON</Label>
              {jsonFields.length > 0 ? (
                <Select
                  value={rule.sourceField}
                  onValueChange={(value) => updateMappingRule(index, 'sourceField', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите поле JSON" />
                  </SelectTrigger>
                  <SelectContent>
                    {jsonFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`json-field-${index}`}
                  value={rule.sourceField}
                  onChange={(e) => updateMappingRule(index, 'sourceField', e.target.value)}
                  placeholder="Например: name, phone, price"
                />
              )}
            </div>
            
            <div className="flex-1">
              <Label htmlFor={`bitrix-field-${index}`}>Поле Bitrix</Label>
              <Select
                value={rule.targetField}
                onValueChange={(value) => updateMappingRule(index, 'targetField', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите поле Bitrix" />
                </SelectTrigger>
                <SelectContent>
                  {bitrixFields.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.title} ({field.id})
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeMappingRule(index)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={addMappingRule}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить правило маппинга
        </Button>
        
        {bitrixFields.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Доступные поля Bitrix:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              {bitrixFields.slice(0, 10).map((field) => (
                <div key={field.id} className="flex justify-between">
                  <span>{field.title}</span>
                  <span className="font-mono">{field.id}</span>
                  {field.required && <span className="text-red-500">*</span>}
                </div>
              ))}
              {bitrixFields.length > 10 && (
                <p className="text-gray-500">... и еще {bitrixFields.length - 10} полей</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}