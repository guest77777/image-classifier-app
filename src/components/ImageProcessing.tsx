'use client'

import { useState } from 'react'
import { Sliders, RotateCw, Maximize2 } from 'lucide-react'

interface ImageProcessingProps {
  onProcess: (options: ProcessingOptions) => void;
  disabled?: boolean;
}

export interface ProcessingOptions {
  brightness: number;
  contrast: number;
  rotation: number;
  scale: number;
}

export function ImageProcessing({ onProcess, disabled = false }: ImageProcessingProps) {
  const [options, setOptions] = useState<ProcessingOptions>({
    brightness: 100,
    contrast: 100,
    rotation: 0,
    scale: 100,
  })

  const handleChange = (name: keyof ProcessingOptions, value: number) => {
    const newOptions = { ...options, [name]: value }
    setOptions(newOptions)
    onProcess(newOptions)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">画像処理オプション</h3>
      
      <div className="space-y-3">
        {/* 明るさ調整 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Sliders className="w-4 h-4" />
              明るさ
            </label>
            <span className="text-sm text-muted">{options.brightness}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={options.brightness}
            onChange={(e) => handleChange('brightness', Number(e.target.value))}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* コントラスト調整 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Sliders className="w-4 h-4" />
              コントラスト
            </label>
            <span className="text-sm text-muted">{options.contrast}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={options.contrast}
            onChange={(e) => handleChange('contrast', Number(e.target.value))}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* 回転 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <RotateCw className="w-4 h-4" />
              回転
            </label>
            <span className="text-sm text-muted">{options.rotation}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={options.rotation}
            onChange={(e) => handleChange('rotation', Number(e.target.value))}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* 拡大/縮小 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Maximize2 className="w-4 h-4" />
              拡大/縮小
            </label>
            <span className="text-sm text-muted">{options.scale}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="200"
            value={options.scale}
            onChange={(e) => handleChange('scale', Number(e.target.value))}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
} 