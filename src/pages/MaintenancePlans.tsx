import { CrudPage, type FieldConfig, type ColumnConfig } from '@/components/CrudPage'

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nome do Plano', type: 'text', required: true },
  {
    name: 'type',
    label: 'Tipo',
    type: 'select',
    options: [
      { label: 'Preventiva', value: 'Preventiva' },
      { label: 'Corretiva', value: 'Corretiva' },
    ],
    required: true,
  },
  { name: 'periodicity', label: 'Periodicidade', type: 'text' },
  {
    name: 'target_vehicle_type',
    label: 'Tipo de Veículo',
    type: 'select',
    options: [
      { label: 'Cavalo Mecânico', value: 'Cavalo Mecânico' },
      { label: 'Carreta', value: 'Carreta' },
      { label: 'Ambos', value: 'Ambos' },
    ],
  },
  { name: 'target_plate', label: 'Placa Alvo', type: 'text' },
  { name: 'responsible', label: 'Responsável', type: 'text' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Ativo', value: 'Ativo' },
      { label: 'Pausado', value: 'Pausado' },
    ],
  },
  { name: 'next_execution', label: 'Próxima Execução', type: 'date' },
  { name: 'checklist', label: 'Checklist (um item por linha)', type: 'tags' },
]

const columns: ColumnConfig[] = [
  { key: 'name', label: 'Nome' },
  { key: 'type', label: 'Tipo', format: 'badge' },
  { key: 'periodicity', label: 'Periodicidade' },
  { key: 'responsible', label: 'Responsável' },
  { key: 'status', label: 'Status', format: 'badge' },
  { key: 'next_execution', label: 'Próxima Execução', format: 'date' },
]

export default function MaintenancePlans() {
  return (
    <CrudPage
      title="Planos de Manutenção"
      table="maintenance_plans"
      fields={fields}
      columns={columns}
      searchKeys={['name', 'responsible', 'target_plate']}
    />
  )
}
