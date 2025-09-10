'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit, Plus, ArrowLeft, Copy } from 'lucide-react'
import FieldMapping from '@/components/FieldMapping'

interface Connection {
  id: string
  name: string
  description?: string
  type: 'BITRIX'
  category: 'CREATE_DEAL' | 'CREATE_LEAD' | 'MOVE_DEAL' | 'MOVE_DEAL_BY_PHONE'
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING'
  config?: string
  webhookUrl: string
  funnelId?: string
  stageId?: string
  fieldMapping?: string
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  bitrixWebhookUrl?: string
  createdAt: string
  updatedAt: string
}

interface BitrixFunnel {
  id: string
  name: string
}

interface BitrixStage {
  id: string
  name: string
  funnelId: string
}

interface FieldMappingRule {
  sourceField: string
  targetField: string
}

const connectionCategoryLabels = {
  CREATE_DEAL: 'Создать сделку',
  CREATE_LEAD: 'Создать лид',
  MOVE_DEAL: 'Переместить сделку',
  MOVE_DEAL_BY_PHONE: 'Переместить сделку по телефону'
}

const connectionStatusLabels = {
  ACTIVE: 'Активна',
  INACTIVE: 'Неактивна',
  ERROR: 'Ошибка',
  PENDING: 'Ожидание'
}

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  ERROR: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800'
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [funnels, setFunnels] = useState<BitrixFunnel[]>([])
  const [stages, setStages] = useState<BitrixStage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingFunnels, setLoadingFunnels] = useState(false)
  const [loadingStages, setLoadingStages] = useState(false)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null)
  const [showEditProjectForm, setShowEditProjectForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Форма создания/редактирования связи
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'CREATE_DEAL' as Connection['category'],
    funnelId: '',
    stageId: '',
    config: '',
    fieldMapping: [] as FieldMappingRule[]
  })

  // Отдельно храним "сохранённый" корректный JSON для маппинга, чтобы не парсить сырые черновики
  const [savedJsonExample, setSavedJsonExample] = useState<string>('')
  const [jsonSaveStatus, setJsonSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })

  // Форма редактирования проекта
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    description: '',
    status: '',
    bitrixWebhookUrl: ''
  })

  useEffect(() => {
    fetchProject()
    fetchConnections()
  }, [projectId])

  useEffect(() => {
    if (project?.bitrixWebhookUrl && showCreateForm) {
      fetchFunnels()
    }
  }, [project?.bitrixWebhookUrl, showCreateForm])

  useEffect(() => {
    if (formData.funnelId && formData.category) {
      fetchStages(formData.funnelId, formData.category)
    }
  }, [formData.funnelId, formData.category])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      } else {
        setError('Ошибка загрузки проекта')
      }
    } catch (err) {
      setError('Ошибка загрузки проекта')
    }
  }

  const fetchConnections = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/connections`)
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections)
      } else {
        setError('Ошибка загрузки связей')
      }
    } catch (err) {
      setError('Ошибка загрузки связей')
    } finally {
      setLoading(false)
    }
  }

  const fetchFunnels = async () => {
    try {
      setLoadingFunnels(true)
      const response = await fetch(`/api/bitrix/funnels?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setFunnels(data.funnels)
      } else {
        console.error('Ошибка загрузки воронок')
      }
    } catch (err) {
      console.error('Ошибка загрузки воронок')
    } finally {
      setLoadingFunnels(false)
    }
  }

  const fetchStages = async (funnelId: string, category: string) => {
    try {
      setLoadingStages(true)
      const response = await fetch(`/api/bitrix/stages?projectId=${projectId}&funnelId=${funnelId}&category=${category}`)
      if (response.ok) {
        const data = await response.json()
        setStages(data.stages)
      } else {
        console.error('Ошибка загрузки столбцов')
      }
    } catch (err) {
      console.error('Ошибка загрузки столбцов')
    } finally {
      setLoadingStages(false)
    }
  }

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/projects/${projectId}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          config: formData.config ? (() => {
            try {
              return JSON.parse(formData.config)
            } catch {
              return {}
            }
          })() : {},
          fieldMapping: JSON.stringify(formData.fieldMapping)
        })
      })

      if (response.ok) {
        setShowCreateForm(false)
        setFormData({ name: '', description: '', category: 'CREATE_DEAL', funnelId: '', stageId: '', config: '', fieldMapping: [] })
        fetchConnections()
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка создания связи')
      }
    } catch (err) {
      setError('Ошибка создания связи')
    }
  }

  const handleUpdateConnection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingConnection) return

    try {
      const response = await fetch(`/api/projects/${projectId}/connections/${editingConnection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          config: formData.config ? (() => {
            try {
              return JSON.parse(formData.config)
            } catch {
              return {}
            }
          })() : {},
          fieldMapping: JSON.stringify(formData.fieldMapping)
        })
      })

      if (response.ok) {
        setEditingConnection(null)
        setFormData({ name: '', description: '', category: 'CREATE_DEAL', funnelId: '', stageId: '', config: '', fieldMapping: [] })
        fetchConnections()
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка обновления связи')
      }
    } catch (err) {
      setError('Ошибка обновления связи')
    }
  }

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту связь?')) return

    try {
      const response = await fetch(`/api/projects/${projectId}/connections/${connectionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchConnections()
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка удаления связи')
      }
    } catch (err) {
      setError('Ошибка удаления связи')
    }
  }

  const startEdit = async (connection: Connection) => {
    setEditingConnection(connection)
    setFormData({
      name: connection.name,
      description: connection.description || '',
      category: connection.category,
      funnelId: connection.funnelId || '',
      stageId: connection.stageId || '',
      config: connection.config || '',
      fieldMapping: connection.fieldMapping ? JSON.parse(connection.fieldMapping) : []
    })
    // При редактировании — сразу подставим сохранённый JSON (если он валиден)
    try {
      if (connection.config) {
        JSON.parse(connection.config)
        setSavedJsonExample(connection.config)
        setJsonSaveStatus({ type: 'success', message: 'JSON загружен из связи' })
      } else {
        setSavedJsonExample('')
        setJsonSaveStatus({ type: null, message: '' })
      }
    } catch {
      setSavedJsonExample('')
      setJsonSaveStatus({ type: 'error', message: 'Сохранённый JSON в связи некорректен' })
    }
    setShowCreateForm(true)
    
    // Загружаем воронки при редактировании
    if (project?.bitrixWebhookUrl) {
      await fetchFunnels()
      
      // Если есть выбранная воронка, загружаем её этапы
      if (connection.funnelId && connection.category) {
        await fetchStages(connection.funnelId, connection.category)
      }
    }
  }

  const cancelEdit = () => {
    setEditingConnection(null)
    setShowCreateForm(false)
    setFormData({ name: '', description: '', category: 'CREATE_DEAL', funnelId: '', stageId: '', config: '', fieldMapping: [] })
    setFunnels([])
    setStages([])
  setSavedJsonExample('')
  setJsonSaveStatus({ type: null, message: '' })
  }

  const handleTestConnection = async () => {
    if (!project?.bitrixWebhookUrl || !formData.category) {
      setError('Заполните все обязательные поля для тестирования')
      return
    }

    // Проверяем специфичные требования для каждой категории
    if (!formData.config) {
      setError('Заполните конфигурацию для тестирования')
      return
    }
    
    if (formData.category === 'MOVE_DEAL') {
      try {
        const config = JSON.parse(formData.config)
        if (!config.dealId) {
          setError('Для тестирования перемещения сделки необходимо указать dealId в JSON')
          return
        }
      } catch {
        setError('Некорректный JSON формат в конфигурации')
        return
      }
    }
    
    if (formData.category === 'MOVE_DEAL_BY_PHONE') {
      try {
        const config = JSON.parse(formData.config)
        if (!config.phone) {
          setError('Для тестирования перемещения сделки по телефону необходимо указать phone в JSON')
          return
        }
      } catch {
        setError('Некорректный JSON формат в конфигурации')
        return
      }
    }

    try {
      // Парсим JSON конфигурацию
      const testData = JSON.parse(formData.config)
      
      // Создаем временную связь для тестирования
      const testConnection = {
        category: formData.category,
        funnelId: formData.funnelId,
        stageId: formData.stageId,
        fieldMapping: JSON.stringify(formData.fieldMapping || []),
        config: JSON.stringify({
          CATEGORY_ID: formData.funnelId,
          STAGE_ID: formData.stageId,
          STATUS_ID: formData.stageId
        })
      }

      // Отправляем тестовые данные на webhook
      const response = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookUrl: project.bitrixWebhookUrl,
          connection: testConnection,
          testData: testData
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        if (formData.category === 'MOVE_DEAL') {
          alert(`Тест успешно выполнен! Сделка обновлена с ID: ${result.id}`)
        } else if (formData.category === 'MOVE_DEAL_BY_PHONE') {
          alert(`Тест успешно выполнен! Сделка найдена и перемещена с ID: ${result.id}`)
        } else {
          alert(`Тест успешно выполнен! Создана карточка с ID: ${result.id}`)
        }
      } else {
        setError(result.error || 'Ошибка тестирования')
      }
    } catch (err) {
      setError('Ошибка парсинга JSON или выполнения теста')
    }
  }

  // Функции для работы с проектом
  const startEditProject = () => {
    if (project) {
      setProjectFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        bitrixWebhookUrl: project.bitrixWebhookUrl || ''
      })
      setShowEditProjectForm(true)
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectFormData)
      })

      if (response.ok) {
        setShowEditProjectForm(false)
        fetchProject() // Обновляем данные проекта
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка обновления проекта')
      }
    } catch (err) {
      setError('Ошибка обновления проекта')
    }
  }

  const handleDeleteProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/dashboard') // Перенаправляем на дашборд после удаления
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка удаления проекта')
      }
    } catch (err) {
      setError('Ошибка удаления проекта')
    }
  }

  const cancelEditProject = () => {
    setShowEditProjectForm(false)
    setProjectFormData({ name: '', description: '', status: '', bitrixWebhookUrl: '' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к проектам
          </Button>
          
          {project && (
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="mt-2 text-gray-600">{project.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={startEditProject}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Редактировать
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Кнопка создания связи */}
        <div className="mb-6">
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать связь
          </Button>
        </div>

        {/* Форма создания/редактирования связи */}
        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingConnection ? 'Редактировать связь' : 'Создать новую связь'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingConnection ? handleUpdateConnection : handleCreateConnection} className="space-y-4">
                <div>
                  <Label htmlFor="name">Название</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Описание</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Категория</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: string) => setFormData({ ...formData, category: value as Connection['category'], funnelId: '', stageId: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(connectionCategoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {project?.bitrixWebhookUrl && formData.category !== 'MOVE_DEAL' && formData.category !== 'MOVE_DEAL_BY_PHONE' && (
                  <>
                    <div>
                      <Label htmlFor="funnel">Воронка</Label>
                      <Select
                        value={formData.funnelId}
                        onValueChange={(value: string) => setFormData({ ...formData, funnelId: value, stageId: '' })}
                        disabled={loadingFunnels || funnels.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingFunnels ? "Загрузка..." : "Выберите воронку"} />
                        </SelectTrigger>
                        <SelectContent>
                          {funnels.map((funnel) => (
                            <SelectItem key={funnel.id} value={funnel.id}>
                              {funnel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="stage">Столбец (этап)</Label>
                      <Select
                        value={formData.stageId}
                        onValueChange={(value: string) => setFormData({ ...formData, stageId: value })}
                        disabled={loadingStages || stages.length === 0 || !formData.funnelId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingStages ? "Загрузка..." : "Выберите столбец"} />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Упрощенный интерфейс для MOVE_DEAL */}
                {formData.category === 'MOVE_DEAL' && project?.bitrixWebhookUrl && (
                  <>
                    <div>
                      <Label htmlFor="funnel">Воронка (куда перемещать)</Label>
                      <Select
                        value={formData.funnelId}
                        onValueChange={(value: string) => setFormData({ ...formData, funnelId: value, stageId: '' })}
                        disabled={loadingFunnels || funnels.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingFunnels ? "Загрузка..." : "Выберите воронку"} />
                        </SelectTrigger>
                        <SelectContent>
                          {funnels.map((funnel) => (
                            <SelectItem key={funnel.id} value={funnel.id}>
                              {funnel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="stage">Столбец (куда перемещать)</Label>
                      <Select
                        value={formData.stageId}
                        onValueChange={(value: string) => setFormData({ ...formData, stageId: value })}
                        disabled={loadingStages || stages.length === 0 || !formData.funnelId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingStages ? "Загрузка..." : "Выберите столбец"} />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="font-medium text-blue-900 mb-2">Пример запроса для тестирования:</h4>
                      <pre className="text-sm text-blue-800 bg-blue-100 p-2 rounded overflow-x-auto">
{`{"dealId": 687}`}
                      </pre>
                      <p className="text-xs text-blue-700 mt-2">
                        Укажите ID существующей сделки в Bitrix24 для тестирования перемещения.
                      </p>
                    </div>
                  </>
                )}

                {!project?.bitrixWebhookUrl && formData.category !== 'MOVE_DEAL_BY_PHONE' && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      Для выбора воронки и столбца необходимо указать Bitrix Webhook URL в настройках проекта.
                    </p>
                  </div>
                )}

                {/* Поле конфигурации для CREATE_DEAL и CREATE_LEAD */}
                {formData.category !== 'MOVE_DEAL' && formData.category !== 'MOVE_DEAL_BY_PHONE' && (
                  <div>
                    <Label htmlFor="config">Конфигурация (JSON)</Label>
                    <textarea
                      id="config"
                      value={formData.config}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, config: e.target.value })}
                      placeholder='{"key": "value"}'
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          try {
                            if (!formData.config.trim()) {
                              setJsonSaveStatus({ type: 'error', message: 'JSON пустой' })
                              setSavedJsonExample('')
                              return
                            }
                            JSON.parse(formData.config)
                            setSavedJsonExample(formData.config)
                            setJsonSaveStatus({ type: 'success', message: 'JSON сохранён и распознан' })
                          } catch (err:any) {
                            setSavedJsonExample('')
                            setJsonSaveStatus({ type: 'error', message: 'Ошибка: ' + (err?.message || 'некорректный JSON') })
                          }
                        }}
                      >
                        Сохранить JSON
                      </Button>
                      {savedJsonExample && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSavedJsonExample('')
                            setJsonSaveStatus({ type: null, message: '' })
                          }}
                        >
                          Очистить сохранённый
                        </Button>
                      )}
                    </div>
                    {jsonSaveStatus.type && (
                      <p className={`mt-1 text-xs ${jsonSaveStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{jsonSaveStatus.message}</p>
                    )}
                    {!savedJsonExample && (
                      <p className="mt-1 text-xs text-gray-500">Сначала введите корректный JSON и нажмите "Сохранить JSON" – поля появятся в списке для маппинга.</p>
                    )}
                  </div>
                )}

                {/* Специальный интерфейс для MOVE_DEAL_BY_PHONE */}
                {formData.category === 'MOVE_DEAL_BY_PHONE' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
                        Перемещение сделки по номеру телефона
                      </h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Эта интеграция найдет сделку по номеру телефона и переместит её в указанную воронку и этап.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Целевая воронка
                          </label>
                          <Select
                            value={formData.funnelId}
                            onValueChange={(value) => setFormData({ ...formData, funnelId: value, stageId: '' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите воронку" />
                            </SelectTrigger>
                            <SelectContent>
                              {funnels.map((funnel) => (
                                <SelectItem key={funnel.id} value={funnel.id}>
                                  {funnel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Целевой этап
                          </label>
                          <Select
                            value={formData.stageId}
                            onValueChange={(value) => setFormData({ ...formData, stageId: value })}
                            disabled={!formData.funnelId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите этап" />
                            </SelectTrigger>
                            <SelectContent>
                              {stages.map((stage) => (
                                <SelectItem key={stage.id} value={stage.id}>
                                  {stage.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">Пример запроса:</h5>
                        <pre className="text-xs bg-blue-100 p-3 rounded overflow-x-auto">
{`POST ${window.location.origin}/api/webhook/${project?.id}
Content-Type: application/json

{
  "phone": "+7 (999) 123-45-67",
  "customField1": "значение1",
  "customField2": "значение2"
}`}
                        </pre>
                      </div>
                    </div>
                    
                  </div>
                )}

                {/* Поле конфигурации для MOVE_DEAL_BY_PHONE */}
                {formData.category === 'MOVE_DEAL_BY_PHONE' && (
                  <div>
                    <Label htmlFor="config">Конфигурация перемещения (JSON)</Label>
                    <textarea
                      id="config"
                      value={formData.config}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        setFormData({ ...formData, config: e.target.value })
                      }}
                      placeholder={`{
  "phone": "+7 (999) 123-45-67",
  "TITLE": "Новое название сделки",
  "OPPORTUNITY": 50000,
  "CURRENCY_ID": "RUB",
  "COMMENTS": "Комментарий к сделке"
}`}
                      className="w-full h-32 p-2 border rounded font-mono text-sm"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(formData.config)
                            setSavedJsonExample(formData.config)
                            setJsonSaveStatus({ type: 'success', message: 'JSON сохранён для маппинга полей' })
                          } catch {
                            setJsonSaveStatus({ type: 'error', message: 'Некорректный JSON формат' })
                          }
                        }}
                      >
                        Сохранить JSON
                      </Button>
                      {savedJsonExample && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSavedJsonExample('')
                            setJsonSaveStatus({ type: null, message: '' })
                          }}
                        >
                          Очистить сохранённый
                        </Button>
                      )}
                    </div>
                    {jsonSaveStatus.type && (
                      <p className={`mt-1 text-xs ${
                        jsonSaveStatus.type === 'success' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {jsonSaveStatus.message}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Обязательное поле: <strong>phone</strong> - номер телефона для поиска сделки. Дополнительно можно указать поля для изменения: TITLE, OPPORTUNITY, CURRENCY_ID, COMMENTS и др.
                    </p>
                    {!savedJsonExample && (
                      <p className="mt-1 text-xs text-gray-500">Сначала введите корректный JSON и нажмите "Сохранить JSON" – поля появятся в списке для маппинга.</p>
                    )}
                  </div>
                )}

                {/* Поле конфигурации для MOVE_DEAL */}
                {formData.category === 'MOVE_DEAL' && (
                  <div>
                    <Label htmlFor="config">Конфигурация перемещения (JSON)</Label>
                    <textarea
                      id="config"
                      value={formData.config}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        setFormData({ ...formData, config: e.target.value })
                      }}
                      placeholder={`{
  "dealId": 687,
  "TITLE": "Новое название сделки",
  "OPPORTUNITY": 50000,
  "CURRENCY_ID": "RUB",
  "COMMENTS": "Комментарий к сделке"
}`}
                      className="w-full h-32 p-2 border rounded font-mono text-sm"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(formData.config)
                            setSavedJsonExample(formData.config)
                            setJsonSaveStatus({ type: 'success', message: 'JSON сохранён для маппинга полей' })
                          } catch {
                            setJsonSaveStatus({ type: 'error', message: 'Некорректный JSON формат' })
                          }
                        }}
                      >
                        Сохранить JSON
                      </Button>
                      {savedJsonExample && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSavedJsonExample('')
                            setJsonSaveStatus({ type: null, message: '' })
                          }}
                        >
                          Очистить сохранённый
                        </Button>
                      )}
                    </div>
                    {jsonSaveStatus.type && (
                      <p className={`mt-1 text-xs ${jsonSaveStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{jsonSaveStatus.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Обязательное поле: <strong>dealId</strong> - ID существующей сделки. Дополнительно можно указать поля для изменения: TITLE, OPPORTUNITY, CURRENCY_ID, COMMENTS и др.
                    </p>
                    {!savedJsonExample && (
                      <p className="mt-1 text-xs text-gray-500">Сначала введите корректный JSON и нажмите "Сохранить JSON" – поля появятся в списке для маппинга.</p>
                    )}
                  </div>
                )}

                {/* Компонент маппинга полей - для всех категорий */}
                {project?.bitrixWebhookUrl && savedJsonExample && (
                  <div>
                    <Label>Маппинг полей</Label>
                    <FieldMapping
                      webhookUrl={project.bitrixWebhookUrl}
                      category={formData.category}
                      value={formData.fieldMapping}
                      onChange={(mapping: any[]) => setFormData({ ...formData, fieldMapping: mapping })}
                      jsonExample={savedJsonExample}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingConnection ? 'Обновить' : 'Создать'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleTestConnection}
                    disabled={
                      !project?.bitrixWebhookUrl || 
                      !formData.category || 
                      (formData.category === 'MOVE_DEAL' ? 
                        (!formData.config || (() => {
                          try {
                            const config = JSON.parse(formData.config || '{}')
                            return !config.dealId
                          } catch {
                            return true
                          }
                        })()) : 
                        formData.category === 'MOVE_DEAL_BY_PHONE' ? 
                          false : // Для MOVE_DEAL_BY_PHONE не требуется config для тестирования
                          !formData.config
                      )
                    }
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  >
                    Тест
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Отмена
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Форма редактирования проекта */}
        {showEditProjectForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Редактировать проект</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div>
                  <Label htmlFor="projectName">Название проекта</Label>
                  <Input
                    id="projectName"
                    value={projectFormData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="projectDescription">Описание</Label>
                  <textarea
                    id="projectDescription"
                    value={projectFormData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <Label htmlFor="projectStatus">Статус</Label>
                  <Select
                    value={projectFormData.status}
                    onValueChange={(value: string) => setProjectFormData({ ...projectFormData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Активный</SelectItem>
                      <SelectItem value="INACTIVE">Неактивный</SelectItem>
                      <SelectItem value="PENDING">Ожидание</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="projectBitrixUrl">Bitrix Webhook URL</Label>
                  <Input
                    id="projectBitrixUrl"
                    type="url"
                    value={projectFormData.bitrixWebhookUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectFormData({ ...projectFormData, bitrixWebhookUrl: e.target.value })}
                    placeholder="https://your-domain.bitrix24.ru/rest/1/webhook_key/"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Обновить проект
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEditProject}>
                    Отмена
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Модальное окно подтверждения удаления */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-red-600">Подтверждение удаления</CardTitle>
                <CardDescription>
                  Вы уверены, что хотите удалить проект "{project?.name}"? Это действие нельзя отменить.
                  Все связи проекта также будут удалены.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      handleDeleteProject()
                    }}
                  >
                    Удалить проект
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Список связей */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{connection.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Bitrix - {connectionCategoryLabels[connection.category]}
                    </CardDescription>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[connection.status]}`}>
                    {connectionStatusLabels[connection.status]}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {connection.description && (
                  <p className="text-sm text-gray-600 mb-4">{connection.description}</p>
                )}
                
                {/* Webhook URL */}
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Webhook URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-white px-2 py-1 rounded border flex-1 truncate">
                      {window.location.origin}{connection.webhookUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${connection.webhookUrl}`)
                        // Можно добавить уведомление о копировании
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(connection)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteConnection(connection.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {connections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Связи не найдены</p>
            <p className="text-gray-400 mt-2">Создайте первую связь для этого проекта</p>
          </div>
        )}
      </div>
    </div>
  )
}