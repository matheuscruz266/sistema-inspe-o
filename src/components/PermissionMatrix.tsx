import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Operation,
  type ScreenPermissions,
  type PermissionMatrixData,
  type TreeNode,
  PERMISSION_TREE,
  AVAILABLE_SCREENS,
  normalizePermissions,
} from '@/lib/permission-tree'

export {
  AVAILABLE_SCREENS,
  normalizePermissions,
  PERMISSION_TREE,
  type Operation,
  type ScreenPermissions,
  type PermissionMatrixData,
  type TreeNode,
}

const OPERATIONS: Operation[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
const EMPTY_OPS: ScreenPermissions = { SELECT: false, INSERT: false, UPDATE: false, DELETE: false }

function getAllScreenKeys(node: TreeNode): string[] {
  const keys = [...node.screens.map((s) => s.key)]
  node.subGroups?.forEach((sg) => keys.push(...getAllScreenKeys(sg)))
  return keys
}

const ALL_SCREEN_KEYS = PERMISSION_TREE.flatMap(getAllScreenKeys)

function getCheckState(matrix: PermissionMatrixData, keys: string[]): boolean | 'indeterminate' {
  const all = keys.every((k) => OPERATIONS.every((op) => (matrix[k] || EMPTY_OPS)[op]))
  if (all) return true
  const none = keys.every((k) => OPERATIONS.every((op) => !(matrix[k] || EMPTY_OPS)[op]))
  return none ? false : 'indeterminate'
}

interface PermissionMatrixProps {
  matrix: PermissionMatrixData
  onChange: (matrix: PermissionMatrixData) => void
}

export function PermissionMatrix({ matrix, onChange }: PermissionMatrixProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const toggleCell = (key: string, op: Operation) => {
    const current = matrix[key] || EMPTY_OPS
    onChange({ ...matrix, [key]: { ...current, [op]: !current[op] } })
  }

  const setAll = (keys: string[], value: boolean) => {
    const next = { ...matrix }
    keys.forEach((k) => {
      next[k] = { SELECT: value, INSERT: value, UPDATE: value, DELETE: value }
    })
    onChange(next)
  }

  const toggleColumn = (op: Operation, value: boolean) => {
    const next = { ...matrix }
    ALL_SCREEN_KEYS.forEach((k) => {
      next[k] = { ...(next[k] || EMPTY_OPS), [op]: value }
    })
    onChange(next)
  }

  const isColumnChecked = (op: Operation) =>
    ALL_SCREEN_KEYS.length > 0 && ALL_SCREEN_KEYS.every((k) => matrix[k]?.[op] === true)

  const renderGroup = (node: TreeNode): React.ReactNode => {
    const allKeys = getAllScreenKeys(node)
    const state = getCheckState(matrix, allKeys)
    const isOpen = openGroups[node.key] ?? true

    return (
      <div key={node.key}>
        <div
          className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => setOpenGroups((p) => ({ ...p, [node.key]: !(p[node.key] ?? true) }))}
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform shrink-0', !isOpen && '-rotate-90')}
          />
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={state} onCheckedChange={(v) => setAll(allKeys, v === true)} />
          </div>
          <span className="text-sm font-medium">{node.label}</span>
        </div>
        {isOpen && (
          <div className="border-l border-border ml-3 pl-2 mb-1">
            {node.screens.map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <span className="flex-1 text-sm">{s.label}</span>
                {OPERATIONS.map((op) => (
                  <div key={op} className="w-16 flex justify-center">
                    <Checkbox
                      checked={matrix[s.key]?.[op] === true}
                      onCheckedChange={() => toggleCell(s.key, op)}
                    />
                  </div>
                ))}
              </div>
            ))}
            {node.subGroups?.map((sg) => renderGroup(sg))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border max-h-[400px] overflow-auto">
      <div className="sticky top-0 bg-background z-10 border-b">
        <div className="flex items-center gap-2 py-2 px-2">
          <span className="flex-1 text-sm font-medium min-w-[140px]">Tela</span>
          {OPERATIONS.map((op) => (
            <div key={op} className="w-16 flex flex-col items-center gap-1">
              <span className="text-xs font-medium">{op}</span>
              <Checkbox
                checked={isColumnChecked(op)}
                onCheckedChange={(v) => toggleColumn(op, v === true)}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="p-1">{PERMISSION_TREE.map((node) => renderGroup(node))}</div>
    </div>
  )
}
