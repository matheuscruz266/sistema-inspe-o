import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nome', type: 'text', required: true },
  { name: 'code', label: 'Código', type: 'text', required: true },
  {
    name: 'category',
    label: 'Categoria',
    type: 'select',
    options: [
      { label: 'Peça', value: 'Peça' },
      { label: 'Insumo', value: 'Insumo' },
      { label: 'Ferramenta', value: 'Ferramenta' },
      { label: 'Lubrificante', value: 'Lubrificante' },
    ],
  },
  {
    name: 'unit',
    label: 'Unidade',
    type: 'select',
    options: [
      { label: 'Un', value: 'Un' },
      { label: 'Lt', value: 'Lt' },
      { label: 'Kg', value: 'Kg' },
      { label: 'Ml', value: 'Ml' },
    ],
  },
  { name: 'min_quantity', label: 'Quantidade Mínima', type: 'number' },
  { name: 'unit_value', label: 'Valor Unitário', type: 'currency' },
  { name: 'supplier', label: 'Fornecedor', type: 'text' },
]

const columns: ColumnConfig[] = [
  { key: 'name', label: 'Nome' },
  { key: 'code', label: 'Código' },
  { key: 'category', label: 'Categoria', format: 'badge' },
  { key: 'unit', label: 'Unidade' },
  { key: 'unit_value', label: 'Valor', format: 'currency' },
]

export default function Products() {
  return (
    <CrudPage
      title="Produtos"
      table="products"
      fields={fields}
      columns={columns}
      searchKeys={['name', 'code', 'supplier']}
    />
  )
}
