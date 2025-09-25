'use client'

import { useEffect, useState } from 'react'

// Force dynamic rendering to avoid SSG issues with environment variables
export const dynamic = 'force-dynamic'
import { MessageTemplate, MessageCategory, supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageEditor } from '@/components/message-editor'
import { MessagePreview } from '@/components/message-preview'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  BarChart3,
  MessageSquare,
  Users,
  Settings,
  Search,
  Filter,
  Grid,
  List,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export default function Home() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [categories, setCategories] = useState<MessageCategory[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [stats, setStats] = useState({
    totalTemplates: 0,
    activeTemplates: 0,
    categories: 0,
    lastUpdated: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('message_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true })

      if (templatesError) throw templatesError

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('message_categories')
        .select('*')
        .order('display_name', { ascending: true })

      if (categoriesError) throw categoriesError

      setTemplates(templatesData || [])
      setCategories(categoriesData || [])

      // Update stats
      setStats({
        totalTemplates: templatesData?.length || 0,
        activeTemplates: templatesData?.filter(t => t.is_active).length || 0,
        categories: categoriesData?.length || 0,
        lastUpdated: templatesData?.[0]?.updated_at || ''
      })

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName)
    return category?.color || '#3b82f6'
  }

  const getCategoryInfo = (categoryName: string) => {
    return categories.find(c => c.name === categoryName)
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.key.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">Loading Message Templates</p>
            <p className="text-sm text-gray-500">Connecting to database...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header Section */}
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Message Templates</h1>
            <p className="text-gray-500">
              Manage your WhatsApp bot responses • {stats.totalTemplates} templates • {stats.activeTemplates} active
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalTemplates}</div>
              <p className="text-sm text-gray-500 mt-1">
                Across {stats.categories} categories
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Active Templates</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.activeTemplates}</div>
              <p className="text-sm text-gray-500 mt-1">
                Currently in use
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
                <Settings className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.categories}</div>
              <p className="text-sm text-gray-500 mt-1">
                Organized types
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
                <Activity className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-900">Live</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Panel - Template List */}
        <div className="xl:col-span-2 space-y-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-gray-200 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.name} value={category.name}>
                    {category.display_name}
                  </option>
                ))}
              </select>
              <div className="flex border border-gray-200 rounded-md">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Template List */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  {filteredTemplates.length} Templates
                  {searchQuery && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      matching "{searchQuery}"
                    </span>
                  )}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {selectedCategory === 'all' ? 'All Categories' : categories.find(c => c.name === selectedCategory)?.display_name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery ? 'Try adjusting your search terms' : 'Get started by creating your first template'}
                  </p>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              ) : (
                <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}`}>
                  {filteredTemplates.map((template) => {
                    const categoryInfo = getCategoryInfo(template.category)
                    return (
                      <div
                        key={template.id}
                        className={`group relative p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedTemplate?.id === template.id
                            ? 'border-green-500 bg-green-50/50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {template.title}
                              </h3>
                              {categoryInfo && (
                                <Badge
                                  variant={template.is_active ? 'default' : 'secondary'}
                                  className="text-xs"
                                  style={{
                                    backgroundColor: template.is_active ? categoryInfo.color : undefined,
                                    color: template.is_active ? 'white' : undefined
                                  }}
                                >
                                  {categoryInfo.display_name}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {template.description || 'No description provided'}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <div className="flex items-center space-x-1">
                                  {template.is_active ? (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-gray-400" />
                                  )}
                                  <span>{template.is_active ? 'Active' : 'Inactive'}</span>
                                </div>
                                {template.variables.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <Settings className="h-3 w-3" />
                                    <span>{template.variables.length} variables</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Editor/Preview */}
        <div className="space-y-6">
          {selectedTemplate ? (
            <>
              <MessageEditor
                template={selectedTemplate}
                categories={categories}
                onSave={() => {
                  fetchData()
                  // Keep the same template selected but refresh its data
                  const updatedTemplate = templates.find(t => t.id === selectedTemplate.id)
                  if (updatedTemplate) {
                    setSelectedTemplate(updatedTemplate)
                  }
                }}
              />
              <MessagePreview template={selectedTemplate} />
            </>
          ) : (
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-gray-400" />
                  <span>Select a Template</span>
                </CardTitle>
                <CardDescription>
                  Choose a message template from the list to edit its content and preview how it appears to users.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to edit</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Click on any template from the list to start editing. You'll see a live preview of how your changes will appear in WhatsApp.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}