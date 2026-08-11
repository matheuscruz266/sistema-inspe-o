import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'code', label: 'Código', type: 'text', required: true },
  { name: 'name', label: 'Nome', type: 'text', required: true },
  { name: 'description', label: 'Descrição', type: 'textarea' },
  {
    name: 'unit',
    label: 'Unidade',
    type: 'select',
    options: [
      { label: 'Un', value: 'Un' },
      { label: 'Hora', value: 'Hora' },
      { label: 'Km', value: 'Km' },
      { label: 'Mês', value: 'Mês' },
    ],
  },
  { name: 'standard_rate', label: 'Tarifa Padrão', type: 'currency' },
]

const columns: ColumnConfig[] = [
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nome' },
  { key: 'unit', label: 'Unidade' },
  { key: 'standard_rate', label: 'Tarifa', format: 'currency' },
]

export default function ServiceCatalog() {
  return (
    <CrudPage
      title="Catálogo de Serviços"
      table="service_catalog"
      fields={fields}
      columns={columns}
      searchKeys={['code', 'name']}
    />
  )
}
