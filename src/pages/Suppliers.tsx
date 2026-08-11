import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nome', type: 'text', required: true },
  { name: 'cnpj', label: 'CNPJ', type: 'text' },
  { name: 'contact', label: 'Contato', type: 'text' },
  { name: 'phone', label: 'Telefone', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'city', label: 'Cidade', type: 'text' },
  { name: 'address', label: 'Endereço', type: 'text' },
]

const columns: ColumnConfig[] = [
  { key: 'name', label: 'Nome' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'city', label: 'Cidade' },
  { key: 'phone', label: 'Telefone' },
]

export default function Suppliers() {
  return (
    <CrudPage
      title="Fornecedores"
      table="suppliers"
      fields={fields}
      columns={columns}
      searchKeys={['name', 'cnpj', 'contact', 'city']}
    />
  )
}
