'use client'

import { UploadCloud, X } from 'lucide-react'
import { useState, useCallback, useRef, useEffect } from 'react'

interface ImagePreview {
  id: string;
  url: string;
  name: string;
}

export function ImageUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [previews, setPreviews] = useState<ImagePreview[]>([])
  const mounted = useRef(true)

  const processFiles = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => {
          if (mounted.current) {
            setPreviews(prev => [...prev, {
              id: Math.random().toString(36).slice(2),
              url: reader.result as string,
              name: file.name
            }])
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }, [processFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files)
      // ファイル選択をリセット（同じファイルを再度選択可能に）
      e.target.value = ''
    }
  }, [processFiles])

  const removeImage = useCallback((id: string) => {
    setPreviews(prev => prev.filter(p => p.id !== id))
  }, [])

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      mounted.current = false
      // URLオブジェクトの解放
      previews.forEach(preview => {
        if (preview.url.startsWith('blob:')) {
          URL.revokeObjectURL(preview.url)
        }
      })
    }
  }, [previews])

  return (
    <div className="w-full space-y-4">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8
          flex flex-col items-center justify-center gap-4
          transition-colors cursor-pointer
          ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 hover:border-gray-300'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelect}
        />
        <UploadCloud className="w-12 h-12 text-muted" />
        <div className="text-center">
          <p className="text-lg font-medium">画像をドロップ</p>
          <p className="text-sm text-muted">または クリックしてファイルを選択</p>
          <p className="text-sm text-muted mt-2">複数の画像をアップロードできます</p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {previews.map(preview => (
            <div
              key={preview.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-black/5 group"
            >
              <img
                src={preview.url}
                alt={preview.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                onClick={() => removeImage(preview.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-xs p-2 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {preview.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 