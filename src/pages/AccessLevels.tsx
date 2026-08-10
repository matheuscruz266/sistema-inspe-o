import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nome do Nível', type: 'text', required: true },
  { name: 'is_active', label: 'Ativo', type: 'switch' },
  { name: 'permissions', label: 'Permissões (JSON - screens: [])', type: 'textarea' },
]

const columns: ColumnConfig[] = [
  { key: 'name', label: 'Nome' },
  { key: 'is_active', label: 'Ativo', format: 'badge' },
]

export default function AccessLevels() {
  return (
    <CrudPage
      title="Níveis de Acesso"
      table="access_levels"
      fields={fields}
      columns={columns}
      searchKeys={['name']}
    />
  )
}
