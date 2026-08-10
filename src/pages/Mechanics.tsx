import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nome', type: 'text', required: true },
  { name: 'cpf', label: 'CPF', type: 'text' },
  { name: 'phone', label: 'Telefone', type: 'text' },
  { name: 'whatsapp', label: 'WhatsApp', type: 'text' },
  { name: 'specialty', label: 'Especialidade', type: 'text' },
  { name: 'hourly_rate', label: 'Valor Hora', type: 'currency' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Ativo', value: 'Ativo' },
      { label: 'Inativo', value: 'Inativo' },
    ],
  },
]

const columns: ColumnConfig[] = [
  { key: 'name', label: 'Nome' },
  { key: 'specialty', label: 'Especialidade' },
  { key: 'hourly_rate', label: 'Valor Hora', format: 'currency' },
  { key: 'status', label: 'Status', format: 'badge' },
]

export default function Mechanics() {
  return (
    <CrudPage
      title="Mecânicos"
      table="mechanics"
      fields={fields}
      columns={columns}
      searchKeys={['name', 'specialty']}
    />
  )
}
