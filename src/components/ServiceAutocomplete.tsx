import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search } from 'lucide-react'

interface ServiceOption {
  id: string
  code: string | null
  name: string
  unit: string | null
  standard_rate: number | null
}

interface Props {
  value: string
  onChange: (v: string, service?: ServiceOption | null) => void
  label?: string
  placeholder?: string
  required?: boolean
  rows?: number
}

export function ServiceAutocomplete({
  value,
  onChange,
  label,
  placeholder = 'Digite o nome do serviço...',
  required,
}: Props) {
  const [query, setQuery] = useState(value || '')
  const [options, setOptions] = useState<ServiceOption[]>([])
  const [show, setShow] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  const fetchOptions = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setOptions([])
      return
    }
    const { data, error } = await supabase
      .from('service_catalog')
      .select('id, code, name, unit, standard_rate')
      .or(`name.ilike.%${trimmed}%,code.ilike.%${trimmed}%`)
      .eq('is_deleted', false)
      .order('name')
      .limit(15)
    if (error || !data) {
      setOptions([])
      return
    }
    setOptions(data as ServiceOption[])
  }, [])

  const onInput = (v: string) => {
    setQuery(v)
    onChange(v, null)
    setHighlight(-1)
    if (v.trim().length >= 1) {
      setShow(true)
      fetchOptions(v)
    } else {
      setShow(false)
      setOptions([])
    }
  }

  const select = (s: ServiceOption) => {
    setQuery(s.name)
    onChange(s.name, s)
    setShow(false)
    setHighlight(-1)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShow(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show || options.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (highlight >= 0 && highlight < options.length) {
        e.preventDefault()
        select(options[highlight])
      }
    } else if (e.key === 'Escape') {
      setShow(false)
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      <div className="relative mt-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => onInput(e.target.value)}
          onFocus={() => query.trim() && setShow(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="pl-8"
          autoComplete="off"
        />
      </div>
      {show && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
          {options.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => select(s)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                idx === highlight ? 'bg-accent' : ''
              }`}
            >
              <span className="truncate">
                {s.name}
                {s.code && <span className="ml-2 text-xs text-muted-foreground">{s.code}</span>}
              </span>
              {s.standard_rate != null && Number(s.standard_rate) > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {Number(s.standard_rate).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {show && options.length === 0 && query.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
          Nenhum serviço encontrado — o texto será usado como descrição livre.
        </div>
      )}
    </div>
  )
}
