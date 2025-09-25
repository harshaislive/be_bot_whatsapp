'use client'

import { useState, useEffect } from 'react'
import { MessageTemplate, MessageCategory, supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { extractVariables } from '@/lib/utils'
import { Save, ToggleLeft, ToggleRight, Tag, X, Check, AlertCircle, Edit3, Type, Hash } from 'lucide-react'

interface MessageEditorProps {
  template: MessageTemplate
  categories: MessageCategory[]
  onSave: () => void
}

export function MessageEditor({ template, categories, onSave }: MessageEditorProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formData, setFormData] = useState({
    title: template.title,
    content: template.content,
    description: template.description || '',
    is_active: template.is_active
  })

  useEffect(() => {
    setFormData({
      title: template.title,
      content: template.content,
      description: template.description || '',
      is_active: template.is_active
    })
  }, [template])

  const detectedVariables = extractVariables(formData.content)
  const hasChanges = formData.title !== template.title ||
                    formData.content !== template.content ||
                    formData.description !== (template.description || '') ||
                    formData.is_active !== template.is_active

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const { error } = await supabase
        .from('message_templates')
        .update({
          title: formData.title,
          content: formData.content,
          description: formData.description,
          variables: detectedVariables,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id)

      if (error) throw error

      setEditing(false)
      setSaveSuccess(true)
      onSave()

      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: template.title,
      content: template.content,
      description: template.description || '',
      is_active: template.is_active
    })
    setEditing(false)
  }

  const getCategoryInfo = () => {
    return categories.find(c => c.name === template.category)
  }

  const categoryInfo = getCategoryInfo()

  return (
    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="text-lg font-semibold"
                    placeholder="Enter template title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this template is used for..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                    <Edit3 className="h-5 w-5 text-gray-400" />
                    <span>{template.title}</span>
                  </CardTitle>
                  {categoryInfo && (
                    <Badge
                      className="text-white border-0"
                      style={{ backgroundColor: categoryInfo.color }}
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {categoryInfo.display_name}
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center space-x-2">
                  <Type className="h-4 w-4 text-gray-400" />
                  <span>{template.description || 'No description provided'}</span>
                </CardDescription>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {saveSuccess && (
              <div className="flex items-center space-x-1 text-green-600 text-sm">
                <Check className="h-4 w-4" />
                <span>Saved!</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
              disabled={!editing}
              className="text-sm"
            >
              {formData.is_active ? (
                <>
                  <ToggleRight className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-green-600 font-medium">Active</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-gray-400 mr-1" />
                  <span className="text-gray-500">Inactive</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Message Content</label>
            <div className="text-xs text-gray-500">
              {formData.content.length} characters
            </div>
          </div>

          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={14}
                className="font-mono text-sm resize-none border-gray-200 focus:border-green-500 focus:ring-green-500"
                placeholder="Enter your message content here..."
              />
              <div className="text-xs text-gray-500 italic">
                Use double braces for variables: name, collective, etc.
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                  {template.content}
                </pre>
              </div>
              {!editing && (
                <div className="absolute inset-0 bg-white/10 hover:bg-white/20 transition-colors rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer"
                     onClick={() => setEditing(true)}>
                  <div className="bg-white shadow-lg rounded-lg px-4 py-2 flex items-center space-x-2">
                    <Edit3 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Click to edit</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Hash className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Variables</label>
            <Badge variant="outline" className="text-xs">
              {detectedVariables.length} detected
            </Badge>
          </div>

          <div className="min-h-[2rem]">
            {detectedVariables.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detectedVariables.map((variable) => (
                  <Badge key={variable} variant="outline" className="font-mono text-xs">
                    {variable}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No variables detected in this template
              </p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Template Key:</span>
            <code className="bg-white px-2 py-1 rounded text-xs border">
              {template.key}
            </code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last Updated:</span>
            <span className="text-gray-900">
              {new Date(template.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {hasChanges && editing && (
              <div className="flex items-center space-x-1 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Unsaved changes</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setEditing(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Template
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}