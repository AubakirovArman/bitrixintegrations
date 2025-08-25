'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, LogOut, Settings, ArrowRight, Edit, Trash2 } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string | null
  bitrixWebhookUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectBitrixUrl, setNewProjectBitrixUrl] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
      } else {
        setError('Ошибка загрузки проектов')
      }
    } catch (error) {
      setError('Ошибка загрузки проектов')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          bitrixWebhookUrl: newProjectBitrixUrl,
        }),
      })

      if (response.ok) {
        setNewProjectName('')
        setNewProjectDescription('')
        setNewProjectBitrixUrl('')
        setShowCreateForm(false)
        fetchProjects()
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка создания проекта')
      }
    } catch (error) {
      setError('Ошибка создания проекта')
    } finally {
      setIsCreating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Ошибка выхода:', error)
    }
  }

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Добавляем для передачи cookies
        body: JSON.stringify({
          name: editingProject.name,
          description: editingProject.description,
          status: editingProject.status,
        }),
      })

      if (response.ok) {
        setEditingProject(null)
        fetchProjects()
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка обновления проекта')
      }
    } catch (error) {
      setError('Ошибка обновления проекта')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include' // Добавляем для передачи cookies
      })

      if (response.ok) {
        setShowDeleteConfirm(null)
        fetchProjects()
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка удаления проекта')
        setShowDeleteConfirm(null) // Закрываем модальное окно при ошибке
      }
    } catch (err) {
      setError('Ошибка удаления проекта')
      setShowDeleteConfirm(null) // Закрываем модальное окно при ошибке
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Настройки
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Projects Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Мои проекты</h2>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать проект
            </Button>
          </div>

          {/* Create Project Form */}
          {showCreateForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Создать новый проект</CardTitle>
                <CardDescription>
                  Заполните информацию о новом проекте
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Название проекта</Label>
                    <Input
                      id="projectName"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectDescription">Описание (необязательно)</Label>
                    <Input
                      id="projectDescription"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bitrixWebhookUrl">Bitrix Webhook URL</Label>
                    <Input
                      id="bitrixWebhookUrl"
                      value={newProjectBitrixUrl}
                      onChange={(e) => setNewProjectBitrixUrl(e.target.value)}
                      placeholder="https://your-domain.bitrix24.ru/rest/1/your-token/"
                      disabled={isCreating}
                    />
                    <p className="text-sm text-gray-500">
                      URL для интеграции с Bitrix24 API
                    </p>
                  </div>
                  {error && (
                    <div className="text-red-500 text-sm">{error}</div>
                  )}
                  <div className="flex space-x-2">
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Создание...' : 'Создать'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false)
                        setNewProjectName('')
                        setNewProjectDescription('')
                        setNewProjectBitrixUrl('')
                        setError('')
                      }}
                      disabled={isCreating}
                    >
                      Отмена
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Edit Project Form */}
          {editingProject && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Редактировать проект</CardTitle>
                <CardDescription>
                  Измените информацию о проекте
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEditProject} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="editProjectName">Название проекта</Label>
                    <Input
                      id="editProjectName"
                      value={editingProject.name}
                      onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="editProjectDescription">Описание (необязательно)</Label>
                     <Input
                       id="editProjectDescription"
                       value={editingProject.description || ''}
                       onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
                       disabled={isCreating}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="editProjectBitrixUrl">Bitrix Webhook URL</Label>
                     <Input
                       id="editProjectBitrixUrl"
                       type="url"
                       placeholder="https://your-domain.bitrix24.ru/rest/1/webhook_key/"
                       value={editingProject.bitrixWebhookUrl || ''}
                       onChange={(e) => setEditingProject({...editingProject, bitrixWebhookUrl: e.target.value})}
                       disabled={isCreating}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label>Статус проекта</Label>
                     <Select
                       value={editingProject.status}
                       onValueChange={(value) => setEditingProject({...editingProject, status: value})}
                       disabled={isCreating}
                     >
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="ACTIVE">Активный</SelectItem>
                         <SelectItem value="INACTIVE">Неактивный</SelectItem>
                         <SelectItem value="ARCHIVED">Архивный</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                  {error && (
                    <div className="text-red-500 text-sm">{error}</div>
                  )}
                  <div className="flex space-x-2">
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingProject(null)
                        setError('')
                      }}
                      disabled={isCreating}
                    >
                      Отмена
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle className="text-red-600">Подтвердите удаление</CardTitle>
                  <CardDescription>
                    Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.
                    Все связи проекта также будут удалены.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(null)}
                    >
                      Отмена
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteProject(showDeleteConfirm)}
                    >
                      Удалить проект
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-gray-500 text-center">
                  <h3 className="text-lg font-medium mb-2">Нет проектов</h3>
                  <p className="text-sm mb-4">Создайте свой первый проект, чтобы начать работу</p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать проект
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/project/${project.id}`)}>
                  <CardHeader>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription>{project.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          project.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : project.status === 'INACTIVE'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status === 'ACTIVE' ? 'Активный' : 
                           project.status === 'INACTIVE' ? 'Неактивный' : 'Архивный'}
                        </span>
                        <span>Создан {formatDate(project.createdAt)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/project/${project.id}`)
                        }}>
                          Открыть
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingProject(project)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowDeleteConfirm(project.id)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}