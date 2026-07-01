import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { CookieConsentBanner } from "@/components/security/CookieConsentBanner";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

// Eager: rota inicial e auth (críticas)
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";

// Lazy: rotas pesadas e secundárias (code-split por rota)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Courses = lazy(() => import("./pages/Courses"));
const Focus = lazy(() => import("./pages/Focus"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Planning = lazy(() => import("./pages/Planning"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Profile = lazy(() => import("./pages/Profile"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AntiVicio = lazy(() => import("./pages/AntiVicio"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Notes = lazy(() => import("./pages/Notes"));
const Redes = lazy(() => import("./pages/Redes"));
const Install = lazy(() => import("./pages/Install"));
const Admin = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function ProtectedRoute({ children }: { readonly children: React.ReactNode }) {
  const { user, loading, isGuest } = useAuth();

  if (loading) return <PageLoader />;
  if (!user && !isGuest) return <Navigate to="/auth" replace />;

  return <>{children}</>;
}

function HomeEntry() {
  const { user, loading, isGuest } = useAuth();

  if (loading) return <PageLoader />;
  if (user || isGuest) return <Navigate to="/dashboard" replace />;

  return <LandingPage />;
}

function AdminRoute({ children }: { readonly children: React.ReactNode }) {
  const { isAdmin, loading } = useUserRole();
  if (loading) return <PageLoader />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AuthenticatedInstallPrompt() {
  const { user } = useAuth();
  if (!user) return null;
  return <InstallPrompt />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomeEntry />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/install" element={<Install />} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/planejamentos" element={<Planning />} />
          <Route path="/cursos" element={<Courses />} />
          <Route path="/foco" element={<Focus />} />
          <Route path="/tarefas" element={<Tasks />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/notas" element={<Notes />} />
          <Route path="/conquistas" element={<Achievements />} />
          <Route path="/antivicio" element={<AntiVicio />} />
          <Route path="/redes" element={<Redes />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
        <AuthenticatedInstallPrompt />
        <CookieConsentBanner />
        <OfflineIndicator />
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
