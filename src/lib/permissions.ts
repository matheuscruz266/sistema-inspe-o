// Standard CRUD operation keys that identify a "screen" node (leaf) in the
// permissions tree, as opposed to a "module" node that just groups screens.
const OPERATION_KEYS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']

function isScreenNode(value: unknown): boolean {
  if (typeof value === 'boolean') return true
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    return OPERATION_KEYS.some((k) => k in o)
  }
  return false
}

/**
 * Flattens the (possibly nested) permissions `screens` object into a list of
 * screen keys.
 *
 * The structure may be flat (`{ users: { SELECT: true } }`) or cascading, where
 * screens are grouped under modules (`{ Cadastros: { users: { SELECT: true } } }`).
 * Any object that does NOT look like a screen (i.e. has no SELECT/INSERT/UPDATE/
 * DELETE keys and is not a boolean) is treated as a module and traversed
 * recursively.
 */
export function normalizeScreensToFlatArray(screens: unknown): string[] {
  if (!screens) return []
  if (Array.isArray(screens)) {
    return screens.filter((s): s is string => typeof s === 'string')
  }
  if (typeof screens !== 'object') return []

  const result: string[] = []
  const walk = (node: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(node)) {
      if (isScreenNode(value)) {
        result.push(key)
      } else if (value && typeof value === 'object') {
        walk(value as Record<string, unknown>)
      }
    }
  }
  walk(screens as Record<string, unknown>)
  return result
}

export function safeHasScreen(screens: unknown, screen: string): boolean {
  return normalizeScreensToFlatArray(screens).includes(screen)
}

/**
 * Checks whether a given screen (possibly nested under modules) grants a
 * specific operation. Traverses the tree recursively until it finds a screen
 * node matching `screen`, then checks the operation on it.
 */
export function safeHasOperation(screens: unknown, screen: string, operation: string): boolean {
  if (!screens) return false
  if (Array.isArray(screens)) {
    return screens.filter((s): s is string => typeof s === 'string').includes(screen)
  }
  if (typeof screens !== 'object') return false

  const findScreen = (node: Record<string, unknown>): unknown => {
    for (const [key, value] of Object.entries(node)) {
      if (key === screen && isScreenNode(value)) {
        return value
      }
      if (value && typeof value === 'object' && !isScreenNode(value)) {
        const found = findScreen(value as Record<string, unknown>)
        if (found !== undefined) return found
      }
    }
    return undefined
  }

  const ops = findScreen(screens as Record<string, unknown>)
  if (ops === undefined) return false
  if (typeof ops === 'boolean') return ops
  if (ops && typeof ops === 'object') {
    return (ops as Record<string, boolean>)[operation] === true
  }
  return false
}

export function isPermissionsAdmin(screens: unknown): boolean {
  const flat = normalizeScreensToFlatArray(screens)
  return flat.includes('access_levels') || flat.includes('users')
}
