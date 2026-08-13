export function normalizeScreensToFlatArray(screens: unknown): string[] {
  if (!screens) return []
  if (Array.isArray(screens)) {
    return screens.filter((s): s is string => typeof s === 'string')
  }
  if (typeof screens === 'object' && screens !== null) {
    return Object.entries(screens as Record<string, unknown>)
      .filter(([, ops]) => {
        if (typeof ops === 'boolean') return ops
        if (ops && typeof ops === 'object') {
          const o = ops as Record<string, boolean>
          return o.SELECT === true || o.INSERT === true || o.UPDATE === true || o.DELETE === true
        }
        return false
      })
      .map(([key]) => key)
  }
  return []
}

export function safeHasScreen(screens: unknown, screen: string): boolean {
  return normalizeScreensToFlatArray(screens).includes(screen)
}

export function safeHasOperation(screens: unknown, screen: string, operation: string): boolean {
  if (!screens) return false
  if (Array.isArray(screens)) {
    return screens.filter((s): s is string => typeof s === 'string').includes(screen)
  }
  if (typeof screens === 'object' && screens !== null) {
    const ops = (screens as Record<string, unknown>)[screen]
    if (!ops) return false
    if (typeof ops === 'boolean') return ops
    if (ops && typeof ops === 'object') {
      return (ops as Record<string, boolean>)[operation] === true
    }
  }
  return false
}

export function isPermissionsAdmin(screens: unknown): boolean {
  const flat = normalizeScreensToFlatArray(screens)
  return flat.includes('access_levels') || flat.includes('users')
}
