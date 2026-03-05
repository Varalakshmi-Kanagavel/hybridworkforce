import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import MainLayout from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/routing/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Attendance from "@/pages/Attendance";
import Leave from "@/pages/Leave";
import Calendar from "@/pages/Calendar";
import Reports from "@/pages/Reports";
import Admin from "@/pages/Admin";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Component to redirect to role-specific dashboard
const DashboardRedirect = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleDashboardMap: Record<string, string> = {
    EMPLOYEE: '/employee/dashboard',
    MANAGER: '/manager/dashboard',
    HR_ADMIN: '/hr/dashboard',
    SYS_ADMIN: '/system/dashboard',
  };

  const dashboardPath = roleDashboardMap[user.role] || '/employee/dashboard';
  return <Navigate to={dashboardPath} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SocketProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route 
                path="/employee/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/manager/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['MANAGER']}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/hr/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['HR_ADMIN']}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/system/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['SYS_ADMIN']}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="/chat" element={<Chat />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/reports" element={<Reports />} />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYS_ADMIN']}>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={['HR_ADMIN', 'SYS_ADMIN']}>
                    <Admin />
                  </ProtectedRoute>
                } 
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </SocketProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
