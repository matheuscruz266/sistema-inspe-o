import { useState, ReactNode } from 'react'
import { useCrud } from '@/hooks/use-crud'
import { sanitizeText } from '@/lib/sanitize'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'number' | 'currency' | 'select' | 'date' | 'textarea' | 'switch' | 'tags'
  options?: { label: string; value: string }[]
  required?: boolean
}

export interface ColumnConfig {
  key: string
  label: string
  format?: 'currency' | 'date' | 'badge'
}

interface CrudPageProps {
  title: string
  table: string
  fields: FieldConfig[]
  columns: ColumnConfig[]
  searchKeys?: string[]
  extraContent?: ReactNode
}

export function CrudPage({
  title,
  table,
  fields,
  columns,
  searchKeys,
  extraContent,
}: CrudPageProps) {
  const { data, loading, create, update, remove } = useCrud<any>(table)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const filtered =
    search && searchKeys
      ? data.filter((item) =>
          searchKeys.some((k) =>
            String(item[k] || '')
              .toLowerCase()
              .includes(search.toLowerCase()),
          ),
        )
      : data

  const handleOpen = (item?: any) => {
    if (item) {
      const formItem = { ...item }
      fields.forEach((f) => {
        if (f.type === 'tags' && Array.isArray(item[f.name]))
          formItem[f.name] = item[f.name].join('\n')
        if (f.type === 'date' && item[f.name]) formItem[f.name] = String(item[f.name]).split('T')[0]
      })
      setForm(formItem)
      setEditing(item)
    } else {
      setForm({})
      setEditing(null)
    }
    setOpen(true)
  }

  const handleSubmit = async () => {
    const submitForm = { ...form }
    fields.forEach((f) => {
      if (f.type === 'text' || f.type === 'textarea')
        submitForm[f.name] = sanitizeText(String(form[f.name] || ''))
      if (f.type === 'tags')
        submitForm[f.name] = String(form[f.name] || '')
          .split('\n')
          .filter(Boolean)
      if (f.type === 'number' || f.type === 'currency')
        submitForm[f.name] = form[f.name] ? parseFloat(form[f.name]) : 0
      if (f.type === 'switch') submitForm[f.name] = !!form[f.name]
    })
    const { error } = editing ? await update(editing.id, submitForm) : await create(submitForm)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await remove(id)
    if (error) toast.error('Erro ao excluir')
    else toast.success('Excluído com sucesso')
  }

  const renderField = (field: FieldConfig) => {
    const value = form[field.name]
    const setVal = (v: any) => setForm((prev) => ({ ...prev, [field.name]: v }))
    if (field.type === 'select')
      return (
        <Select value={value || ''} onValueChange={setVal}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    if (field.type === 'textarea')
      return <Textarea value={value || ''} onChange={(e) => setVal(e.target.value)} />
    if (field.type === 'tags')
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Um item por linha"
        />
      )
    if (field.type === 'date')
      return <Input type="date" value={value || ''} onChange={(e) => setVal(e.target.value)} />
    if (field.type === 'switch') return <Switch checked={!!value} onCheckedChange={setVal} />
    if (field.type === 'number')
      return <Input type="number" value={value || ''} onChange={(e) => setVal(e.target.value)} />
    if (field.type === 'currency')
      return (
        <Input
          type="number"
          step="0.01"
          value={value || ''}
          onChange={(e) => setVal(e.target.value)}
        />
      )
    return <Input value={value || ''} onChange={(e) => setVal(e.target.value)} />
  }

  const renderCell = (col: ColumnConfig, item: any) => {
    const value = item[col.key]
    if (col.format === 'currency') return formatCurrency(value)
    if (col.format === 'date') return formatDate(value)
    if (col.format === 'badge')
      return (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {value || '-'}
        </span>
      )
    return String(value ?? '-')
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>
      {extraContent}
      {searchKeys && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-center py-8 text-muted-foreground"
                >
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>{renderCell(col, item)}</TableCell>
                  ))}
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label>
                  {field.label}
                  {field.required && ' *'}
                </Label>
                {renderField(field)}
              </div>
            ))}
            <Button onClick={handleSubmit} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
