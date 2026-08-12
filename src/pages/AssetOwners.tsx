import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nome', type: 'text', required: true },
  {
    name: 'owner_type',
    label: 'Tipo',
    type: 'select',
    options: [
      { label: 'Julitago', value: 'julitago' },
      { label: 'Empresa Afiliada', value: 'affiliated_company' },
      { label: 'Terceiro', value: 'third_party' },
    ],
  },
  { name: 'cnpj_cpf', label: 'CNPJ/CPF', type: 'text' },
  { name: 'notes', label: 'Observações', type: 'text' },
]

const columns: ColumnConfig[] = [
  { key: 'name', label: 'Nome' },
  { key: 'owner_type', label: 'Tipo', format: 'badge' },
  { key: 'cnpj_cpf', label: 'CNPJ/CPF' },
  { key: 'notes', label: 'Observações' },
]

export default function AssetOwners() {
  return (
    <CrudPage
      title="Proprietários de Ativos"
      table="asset_owners"
      fields={fields}
      columns={columns}
      searchKeys={['name', 'cnpj_cpf']}
    />
  )
}
