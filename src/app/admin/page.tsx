'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, Users, FolderOpen } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  _count: {
    projects: number
  }
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activeTab, setActiveTab] = useState<'users' | 'projects'>('users')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'USER' | 'ADMIN'>('USER')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<'USER' | 'ADMIN'>('USER')
  const [editPassword, setEditPassword] = useState('')
  const [processing, setProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    try {
      if (activeTab === 'users') {
        const response = await fetch('/api/admin/users')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users)
        } else {
          setError('Ошибка загрузки пользователей')
        }
      } else {
        const response = await fetch('/api/admin/projects')
        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects)
        } else {
          setError('Ошибка загрузки проектов')
        }
      }
    } catch (error) {
      setError('Ошибка загрузки данных')
    } finally {
      setIsLoading(false)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
            <h1 className="text-xl font-semibold text-gray-900">Админ панель</h1>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
                К Dashboard
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
        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-4 w-4 mr-2" />
              Пользователи
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'projects'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Проекты
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Пользователи</h2>
              <p className="text-gray-600">Всего пользователей: {users.length}</p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Создать пользователя</CardTitle>
                <CardDescription>Админ может добавить нового пользователя</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={async (e) => {
                  e.preventDefault()
                  setCreating(true)
                  setError('')
                  try {
                    const resp = await fetch('/api/admin/users', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: newEmail, name: newName, password: newPassword, role: newRole })
                    })
                    const data = await resp.json()
                    if (!resp.ok) {
                      setError(data.error || 'Ошибка создания')
                    } else {
                      setNewEmail(''); setNewName(''); setNewPassword(''); setNewRole('USER')
                      fetchData()
                    }
                  } catch (err) {
                    setError('Ошибка сети при создании')
                  } finally {
                    setCreating(false)
                  }
                }}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input className="border rounded px-2 py-1 w-full" type="email" required value={newEmail} onChange={e=>setNewEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Имя</label>
                    <input className="border rounded px-2 py-1 w-full" value={newName} onChange={e=>setNewName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Пароль</label>
                    <input className="border rounded px-2 py-1 w-full" type="password" required value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Роль</label>
                    <select className="border rounded px-2 py-1 w-full" value={newRole} onChange={e=>setNewRole(e.target.value as any)}>
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex gap-2 items-end">
                    <Button type="submit" disabled={creating}>{creating ? 'Создание...' : 'Создать'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <Card key={user.id} className="relative">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {user.name || 'Без имени'}
                    </CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Роль:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.role === 'ADMIN' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'ADMIN' ? 'Админ' : 'Пользователь'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Проектов:</span>
                        <span className="font-medium">{user._count.projects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Регистрация:</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(user.createdAt)}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditingUser(user)
                          setEditName(user.name || '')
                          setEditRole(user.role as any)
                          setEditPassword('')
                        }}>Редактировать</Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={async ()=>{
                          if (!confirm('Удалить пользователя?')) return
                          setProcessing(true)
                          try {
                            const resp = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
                            const data = await resp.json()
                            if (!resp.ok) setError(data.error || 'Ошибка удаления')
                            else fetchData()
                          } catch {
                            setError('Ошибка сети при удалении')
                          } finally { setProcessing(false) }
                        }}>Удалить</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {editingUser && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Редактировать пользователя</CardTitle>
                  <CardDescription>{editingUser.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={async (e)=>{
                    e.preventDefault()
                    setProcessing(true)
                    setError('')
                    try {
                      const payload: any = { name: editName, role: editRole }
                      if (editPassword) payload.password = editPassword
                      const resp = await fetch(`/api/admin/users/${editingUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                      const data = await resp.json()
                      if (!resp.ok) setError(data.error || 'Ошибка сохранения')
                      else { setEditingUser(null); fetchData() }
                    } catch { setError('Ошибка сети при сохранении') }
                    finally { setProcessing(false) }
                  }}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Имя</label>
                      <input className="border rounded px-2 py-1 w-full" value={editName} onChange={e=>setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Роль</label>
                      <select className="border rounded px-2 py-1 w-full" value={editRole} onChange={e=>setEditRole(e.target.value as any)}>
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Новый пароль (если нужно сменить)</label>
                      <input className="border rounded px-2 py-1 w-full" type="password" value={editPassword} onChange={e=>setEditPassword(e.target.value)} placeholder="Оставьте пустым чтобы не менять" />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <Button type="submit" disabled={processing}>{processing ? 'Сохранение...' : 'Сохранить'}</Button>
                      <Button type="button" variant="outline" disabled={processing} onClick={()=> setEditingUser(null)}>Отмена</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Проекты</h2>
              <p className="text-gray-600">Всего проектов: {projects.length}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription>{project.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Статус:</span>
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
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Владелец:</span>
                        <span className="font-medium">
                          {project.user.name || project.user.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Создан:</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(project.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}