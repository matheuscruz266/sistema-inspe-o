/* Main App Component */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Index from '@/pages/Index'
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import NotFound from '@/pages/NotFound'
import Vehicles from '@/pages/Vehicles'
import MaintenancePlans from '@/pages/MaintenancePlans'
import InspectionPlans from '@/pages/InspectionPlans'
import Entries from '@/pages/Entries'
import Scheduling from '@/pages/Scheduling'
import Stock from '@/pages/Stock'
import Products from '@/pages/Products'
import Mechanics from '@/pages/Mechanics'
import Drivers from '@/pages/Drivers'
import People from '@/pages/People'
import AccessLevels from '@/pages/AccessLevels'
import Users from '@/pages/Users'
import Components from '@/pages/Components'
import ServiceCatalog from '@/pages/ServiceCatalog'
import Suppliers from '@/pages/Suppliers'
import History from '@/pages/History'
import DashMaintenance from '@/pages/DashMaintenance'
import Kanban from '@/pages/Kanban'
import Clients from '@/pages/Clients'
import Locations from '@/pages/Locations'
import AssetOwners from '@/pages/AssetOwners'
import VehicleSets from '@/pages/VehicleSets'
import TrailerCargoProfiles from '@/pages/TrailerCargoProfiles'
import Patios from '@/pages/Patios'
import RoutesPage from '@/pages/Routes'
import CarrierContracts from '@/pages/CarrierContracts'
import Demands from '@/pages/Demands'
import Trips from '@/pages/Trips'
import Receipts from '@/pages/Receipts'
import FuelRecords from '@/pages/FuelRecords'
import Telemetry from '@/pages/Telemetry'
import SalesInvoices from '@/pages/SalesInvoices'
import FreightDocuments from '@/pages/FreightDocuments'
import StockReport from '@/pages/StockReport'
import TripMarginReport from '@/pages/TripMarginReport'
import YardPayments from '@/pages/YardPayments'
import DashYards from '@/pages/DashYards'
import FinancialDashboard from '@/pages/FinancialDashboard'

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Index />} />
            <Route path="/veiculos" element={<Vehicles />} />
            <Route path="/planos-manutencao" element={<MaintenancePlans />} />
            <Route path="/planos-inspecao" element={<InspectionPlans />} />
            <Route path="/lancamentos" element={<Entries />} />
            <Route path="/agendamento" element={<Scheduling />} />
            <Route path="/execucao-inspecao" element={<Entries />} /> // usa InspectionExecution
            exportado de Entries
            <Route path="/estoque" element={<Stock />} />
            <Route path="/recebimentos" element={<Receipts />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/mecanicos" element={<Mechanics />} />
            <Route path="/motoristas" element={<Drivers />} />
            <Route path="/pessoas" element={<People />} />
            <Route path="/niveis-acesso" element={<AccessLevels />} />
            <Route path="/usuarios" element={<Users />} />
            <Route path="/componentes" element={<Components />} />
            <Route path="/servicos" element={<ServiceCatalog />} />
            <Route path="/fornecedores" element={<Suppliers />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/historico" element={<History />} />
            <Route path="/dash-manutencao" element={<DashMaintenance />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/locais" element={<Locations />} />
            <Route path="/proprietarios" element={<AssetOwners />} />
            <Route path="/conjuntos" element={<VehicleSets />} />
            <Route path="/perfis-carga-carreta" element={<TrailerCargoProfiles />} />
            <Route path="/patios" element={<Patios />} />
            <Route path="/rotas" element={<RoutesPage />} />
            <Route path="/contratos-frete" element={<CarrierContracts />} />
            <Route path="/demandas" element={<Demands />} />
            <Route path="/viagens" element={<Trips />} />
            <Route path="/combustivel" element={<FuelRecords />} />
            <Route path="/telemetria" element={<Telemetry />} />
            <Route path="/notas-fiscais" element={<SalesInvoices />} />
            <Route path="/cte" element={<FreightDocuments />} />
            <Route path="/relatorios/estoque" element={<StockReport />} />
            <Route path="/relatorios/margem" element={<TripMarginReport />} />
            <Route path="/pagamentos-patio" element={<YardPayments />} />
            <Route path="/dash-patios" element={<DashYards />} />
            <Route path="/dashboard-financeiro" element={<FinancialDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
