import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function extractVariables(content: string): string[] {
  const variableRegex = /\{\{(\w+)\}\}/g
  const variables = []
  let match

  while ((match = variableRegex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  return variables
}

export function renderPreview(content: string, variables: Record<string, string> = {}): string {
  let preview = content

  // Replace variables with sample data
  const sampleData = {
    name: 'John',
    collective: 'Mumbai Collective',
    ...variables
  }

  Object.entries(sampleData).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    preview = preview.replace(regex, value)
  })

  return preview
}