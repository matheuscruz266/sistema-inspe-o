import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'plate', label: 'Placa', type: 'text', required: true },
  {
    name: 'vehicle_type',
    label: 'Tipo',
    type: 'select',
    options: [
      { label: 'Cavalo Mecânico', value: 'Cavalo Mecânico' },
      { label: 'Carreta', value: 'Carreta' },
    ],
    required: true,
  },
  { name: 'brand', label: 'Marca', type: 'text' },
  { name: 'model', label: 'Modelo', type: 'text' },
  { name: 'year', label: 'Ano', type: 'number' },
  { name: 'axles_count', label: 'Qtd. Eixos', type: 'number' },
  { name: 'cost_center', label: 'Centro de Custo', type: 'text' },
  { name: 'purchase_cost', label: 'Custo de Aquisição', type: 'currency' },
]

const columns: ColumnConfig[] = [
  { key: 'plate', label: 'Placa' },
  { key: 'vehicle_type', label: 'Tipo', format: 'badge' },
  { key: 'brand', label: 'Marca' },
  { key: 'model', label: 'Modelo' },
  { key: 'year', label: 'Ano' },
]

export default function Vehicles() {
  return (
    <CrudPage
      title="Veículos"
      table="vehicles"
      fields={fields}
      columns={columns}
      searchKeys={['plate', 'brand', 'model']}
    />
  )
}
