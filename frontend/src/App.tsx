import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./auth/RouteGuards";
import { AppShell } from "./components/LiteAppShell";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { AuthLayout } from "./components/auth/AuthLayout";
import { CategoriesPage } from "./pages/CategoriesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";

export default function App() {
  return (
    <AuthProvider>
      <ConnectionStatus />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
