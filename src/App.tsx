/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Index from '@/pages/Index'
import Login from '@/pages/Login'
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
import AccessLevels from '@/pages/AccessLevels'
import Users from '@/pages/Users'

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
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
            <Route path="/estoque" element={<Stock />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/mecanicos" element={<Mechanics />} />
            <Route path="/motoristas" element={<Drivers />} />
            <Route path="/niveis-acesso" element={<AccessLevels />} />
            <Route path="/usuarios" element={<Users />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
