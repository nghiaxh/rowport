import { useEffect, useState, type ReactElement } from 'react'
import { Moon, Sun } from '@phosphor-icons/react'
import {
  resolveSystemTheme,
  resolveTheme,
  useThemeStore,
  type ResolvedTheme
} from '../../stores/useThemeStore'
import { useT } from '../../lib/i18n'

export function ThemeToggle(): ReactElement {
  const t = useT()
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(resolveSystemTheme())

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => setSystemTheme(resolveSystemTheme())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = resolveTheme(theme, systemTheme)
  const isDark = resolved === 'dark'

  return (
    <button
      type="button"
      title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      onClick={toggleTheme}
      className="flex size-8 items-center justify-center rounded text-app-fg-muted transition-colors hover:bg-app-bg-soft hover:text-app-fg"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
