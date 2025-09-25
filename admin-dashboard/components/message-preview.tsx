'use client'

import { useState } from 'react'
import { MessageTemplate } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { renderPreview } from '@/lib/utils'
import { Smartphone, RefreshCw } from 'lucide-react'

interface MessagePreviewProps {
  template: MessageTemplate
}

export function MessagePreview({ template }: MessagePreviewProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({
    name: 'John Doe',
    collective: 'Mumbai Collective',
  })

  const previewContent = renderPreview(template.content, variableValues)

  const handleVariableChange = (variable: string, value: string) => {
    setVariableValues(prev => ({
      ...prev,
      [variable]: value
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Live Preview
        </CardTitle>
        <CardDescription>
          See how your message will appear to users on WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Variable Inputs */}
          {template.variables.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Test Variables</label>
              <div className="grid grid-cols-1 gap-3">
                {template.variables.map((variable) => (
                  <div key={variable}>
                    <label className="text-xs text-gray-600 mb-1 block">
                      {`{{${variable}}}`}
                    </label>
                    <Input
                      value={variableValues[variable] || ''}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      placeholder={`Enter ${variable}...`}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp-style Preview */}
          <div>
            <label className="text-sm font-medium mb-2 block">WhatsApp Preview</label>
            <div className="bg-green-500 p-4 rounded-lg">
              <div className="bg-white rounded-lg p-4 shadow-sm max-w-sm mx-auto">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                    B
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Beforest</div>
                    <div className="text-xs text-green-600">online</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="bg-green-100 rounded-lg p-3 max-w-xs">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                      {previewContent}
                    </pre>
                    <div className="text-xs text-gray-500 mt-2 text-right">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Preview Updates Live</p>
                <p className="text-blue-700">
                  Changes to variable values will automatically update the preview above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}