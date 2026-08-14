import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

// Cliente sem tipagem de tabela: este componente é genérico e opera sobre nomes
// de tabela definidos em tempo de execução, o que a tipagem do supabase-js v2
// não suporta bem (erro de "type instantiation excessively deep"). O `any`
// local é intencional e mantém a API original intacta.
const db: any = supabase

export interface SubField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'switch' | 'date'
  options?: { label: string; value: string }[]
  dependsOn?: string
  computeValue?: (dependentValue: string) => string
}

export interface SubColumn {
  key: string
  label: string
}

interface Props {
  table: string
  parentId: string
  parentField: string
  fields: SubField[]
  columns: SubColumn[]
}

export function SubEntityManager({ table, parentId, parentField, fields, columns }: Props) {
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})

  const fetchData = useCallback(async () => {
    if (!parentId) return
    const { data } = await db
      .from(table)
      .select('*')
      .eq(parentField, parentId)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .order('created_at')
    setItems(data || [])
  }, [table, parentId, parentField])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpen = (item?: any) => {
    setForm(item ? { ...item } : {})
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    const payload = { ...form, [parentField]: parentId }
    const { error } = editing
      ? await db
          .from(table)
          .update(payload)
          .eq('id', editing.id)
      : await db.from(table).insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error: softError } = await db
      .from(table)
      .update({ is_deleted: true })
      .eq('id', id)
    if (softError) {
      const { error } = await db.from(table).delete().eq('id', id)
      if (error) toast.error('Erro ao excluir')
      else {
        toast.success('Excluído')
        fetchData()
      }
    } else {
      toast.success('Excluído')
      fetchData()
    }
  }

  const set = (f: SubField, v: any) => {
    setForm((p) => {
      const newForm = { ...p, [f.name]: v }
      fields.forEach((other) => {
        if (other.dependsOn === f.name && other.computeValue) {
          newForm[other.name] = other.computeValue(v)
        }
      })
      return newForm
    })
  }

  const renderField = (f: SubField) => {
    const val = form[f.name]
    if (f.type === 'select')
      return (
        <Select value={val || ''} onValueChange={(v) => set(f, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {f.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    if (f.type === 'switch') return <Switch checked={!!val} onCheckedChange={(v) => set(f, v)} />
    if (f.type === 'date')
      return <Input type="date" value={val || ''} onChange={(e) => set(f, e.target.value)} />
    if (f.type === 'number')
      return (
        <Input
          type="number"
          step="0.01"
          value={val || ''}
          onChange={(e) => set(f, e.target.value)}
        />
      )
    return <Input value={val || ''} onChange={(e) => set(f, e.target.value)} />
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => handleOpen()}>
          <Plus className="mr-1 h-3 w-3" /> Adicionar
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-center py-4 text-muted-foreground"
                >
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((c) => (
                    <TableCell key={c.key}>{String(item[c.key] ?? '-')}</TableCell>
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
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label>{f.label}</Label>
                {renderField(f)}
              </div>
            ))}
            <Button onClick={handleSave} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
