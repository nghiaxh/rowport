import { X } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'
import type { ReactElement } from 'react'

const COLOR_TAGS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#71717a'
]

export function ColorTagPicker({
  value,
  onChange
}: {
  value: string | undefined
  onChange: (color: string | undefined) => void
}): ReactElement {
  const t = useT()
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        title={t('colorTag.none')}
        onClick={() => onChange(undefined)}
        className={cn(
          'flex size-7 items-center justify-center rounded-full border transition-colors',
          value === undefined
            ? 'border-app-fg text-app-fg'
            : 'border-app-edge text-app-fg-soft hover:border-app-fg-muted hover:text-app-fg-muted'
        )}
      >
        <X size={12} />
      </button>
      {COLOR_TAGS.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          onClick={() => onChange(color)}
          className={cn(
            'size-7 rounded-full transition-transform hover:scale-110',
            value === color && 'ring-2 ring-app-fg ring-offset-1 ring-offset-app-bg'
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
