import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/hooks/useCurrency";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import UserLayout from "@/components/UserLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProviders from "@/pages/admin/AdminProviders";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminServices from "@/pages/admin/AdminServices";
import AdminMapping from "@/pages/admin/AdminMapping";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminPaymentSettings from "@/pages/admin/AdminPaymentSettings";
import AdminTickets from "@/pages/admin/AdminTickets";
import UserDashboard from "@/pages/user/UserDashboard";
import UserServices from "@/pages/user/UserServices";
import UserOrders from "@/pages/user/UserOrders";
import UserFunds from "@/pages/user/UserFunds";
import UserContact from "@/pages/user/UserContact";
import UserTickets from "@/pages/user/UserTickets";
import UserAccount from "@/pages/user/UserAccount";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={role === "admin" ? "/admin" : "/dashboard/services"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CurrencyProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="providers" element={<AdminProviders />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="mapping" element={<AdminMapping />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="payment-settings" element={<AdminPaymentSettings />} />
              <Route path="tickets" element={<AdminTickets />} />
            </Route>

            {/* User routes */}
            <Route path="/dashboard" element={<ProtectedRoute requiredRole="user"><UserLayout /></ProtectedRoute>}>
              <Route index element={<UserDashboard />} />
              <Route path="services" element={<UserServices />} />
              <Route path="orders" element={<UserOrders />} />
              <Route path="funds" element={<UserFunds />} />
              <Route path="contact" element={<UserContact />} />
              <Route path="tickets" element={<UserTickets />} />
              <Route path="account" element={<UserAccount />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </CurrencyProvider>
  </QueryClientProvider>
);

export default App;
