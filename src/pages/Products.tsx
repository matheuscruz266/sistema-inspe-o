import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Plus, Pencil, Search, ImageOff } from 'lucide-react'
import { ProductDialog } from '@/components/ProductDialog'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const { canPerform } = useAuth()
  const canEdit = canPerform('products', 'UPDATE')

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = products
    .filter((p) => showInactive || p.is_active !== false)
    .filter((p) =>
      search
        ? ['name', 'code', 'manufacturer_code', 'oem_code', 'supplier_code', 'ean', 'brand'].some(
            (k) =>
              String(p[k] || '')
                .toLowerCase()
                .includes(search.toLowerCase()),
          )
        : true,
    )

  const handleToggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('products').update({ is_active: !current }).eq('id', id)
    if (error) toast.error('Erro ao alterar status')
    else {
      toast.success(!current ? 'Produto ativado' : 'Produto inativado')
      fetchData()
    }
  }

  const handleOpen = (id?: string) => {
    setEditingId(id || null)
    setOpen(true)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código, EAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          <span className="text-sm text-muted-foreground">Mostrar inativos</span>
        </div>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Un.</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.photo_url ? (
                      <img
                        src={p.photo_url}
                        alt={p.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.code}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.category}</Badge>
                  </TableCell>
                  <TableCell>{p.brand || '-'}</TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell>{formatCurrency(p.unit_value)}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active === false ? 'destructive' : 'default'}>
                      {p.is_active === false ? 'Inativo' : 'Ativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(p.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Switch
                        checked={p.is_active !== false}
                        onCheckedChange={() => handleToggleActive(p.id, p.is_active !== false)}
                        className="ml-1"
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <ProductDialog open={open} onOpenChange={setOpen} editingId={editingId} onSaved={fetchData} />
    </div>
  )
}
