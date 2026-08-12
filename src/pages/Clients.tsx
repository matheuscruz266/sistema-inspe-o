import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'trade_name', label: 'Nome Fantasia', type: 'text', required: true },
  { name: 'group_name', label: 'Grupo', type: 'text' },
  { name: 'cnpj', label: 'CNPJ', type: 'text' },
  { name: 'city', label: 'Cidade', type: 'text' },
  { name: 'state', label: 'Estado', type: 'text' },
  {
    name: 'default_unit',
    label: 'Unidade Padrão',
    type: 'select',
    options: [
      { label: 'TON', value: 'TON' },
      { label: 'M³', value: 'M3' },
    ],
  },
  { name: 'conversion_factor', label: 'Fator de Conversão', type: 'number' },
  { name: 'active', label: 'Ativo', type: 'switch' },
]

const columns: ColumnConfig[] = [
  { key: 'trade_name', label: 'Nome Fantasia' },
  { key: 'group_name', label: 'Grupo' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'Estado' },
  { key: 'default_unit', label: 'Unidade', format: 'badge' },
  { key: 'active', label: 'Ativo', format: 'badge' },
]

export default function Clients() {
  return (
    <CrudPage
      title="Clientes"
      table="clients"
      fields={fields}
      columns={columns}
      searchKeys={['trade_name', 'group_name', 'cnpj', 'city']}
    />
  )
}
