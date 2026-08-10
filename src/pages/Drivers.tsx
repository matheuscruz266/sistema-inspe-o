import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nome', type: 'text', required: true },
  { name: 'cpf', label: 'CPF', type: 'text' },
  { name: 'birth_date', label: 'Data de Nascimento', type: 'date' },
  { name: 'phone', label: 'Telefone', type: 'text' },
  { name: 'whatsapp', label: 'WhatsApp', type: 'text' },
]

const columns: ColumnConfig[] = [
  { key: 'name', label: 'Nome' },
  { key: 'cpf', label: 'CPF' },
  { key: 'phone', label: 'Telefone' },
  { key: 'whatsapp', label: 'WhatsApp' },
]

export default function Drivers() {
  return (
    <CrudPage
      title="Motoristas"
      table="drivers"
      fields={fields}
      columns={columns}
      searchKeys={['name', 'cpf']}
    />
  )
}
