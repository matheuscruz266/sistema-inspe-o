import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'plate', label: 'Placa', type: 'text', required: true },
  {
    name: 'vehicle_type',
    label: 'Tipo de Veículo',
    type: 'select',
    options: [
      { label: 'Cavalo Mecânico', value: 'Cavalo Mecânico' },
      { label: 'Carreta', value: 'Carreta' },
    ],
    required: true,
  },
  {
    name: 'periodicity',
    label: 'Periodicidade',
    type: 'select',
    options: [
      { label: 'Diária', value: 'Diária' },
      { label: 'Semanal', value: 'Semanal' },
      { label: 'Mensal', value: 'Mensal' },
    ],
  },
  {
    name: 'responsible',
    label: 'Responsável',
    type: 'select',
    options: [
      { label: 'Motorista', value: 'Motorista' },
      { label: 'Oficina Interna', value: 'Oficina Interna' },
    ],
  },
  { name: 'last_inspection', label: 'Última Inspeção', type: 'date' },
  { name: 'next_inspection', label: 'Próxima Inspeção', type: 'date' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Em Dia', value: 'Em Dia' },
      { label: 'Vencido', value: 'Vencido' },
      { label: 'Pendente', value: 'Pendente' },
    ],
  },
  { name: 'checklist', label: 'Checklist (um item por linha)', type: 'tags' },
]

const columns: ColumnConfig[] = [
  { key: 'plate', label: 'Placa' },
  { key: 'vehicle_type', label: 'Tipo', format: 'badge' },
  { key: 'periodicity', label: 'Periodicidade' },
  { key: 'responsible', label: 'Responsável' },
  { key: 'next_inspection', label: 'Próxima Inspeção', format: 'date' },
  { key: 'status', label: 'Status', format: 'badge' },
]

export default function InspectionPlans() {
  return (
    <CrudPage
      title="Planos de Inspeção"
      table="inspection_plans"
      fields={fields}
      columns={columns}
      searchKeys={['plate']}
    />
  )
}
