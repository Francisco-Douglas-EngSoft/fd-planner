import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createIdbPersister } from "@/lib/queryPersister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { MainLayout } from "@/components/layout/MainLayout";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { CookieConsentBanner } from "@/components/security/CookieConsentBanner";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FcmForegroundListener } from "@/components/notifications/FcmForegroundListener";
import { lazy, Suspense } from "react";
import { telas } from "@/lib/routePreload";

import NotFound from "./pages/NotFound";

// Todas as telas são baixadas sob demanda (ver src/lib/routePreload.ts); a tela inicial
// já começa a baixar em main.tsx, junto com o restante do app.
const LandingPage = lazy(telas['/']);
const Auth = lazy(telas['/auth']);
const Dashboard = lazy(telas['/dashboard']);
const Courses = lazy(telas['/cursos']);
const Focus = lazy(telas['/foco']);
const Tasks = lazy(telas['/tarefas']);
const Planning = lazy(telas['/planejamentos']);
const Reports = lazy(telas['/relatorios']);
const Settings = lazy(telas['/configuracoes']);
const Achievements = lazy(telas['/conquistas']);
const Profile = lazy(telas['/perfil']);
const Onboarding = lazy(telas['/onboarding']);
const AntiVicio = lazy(telas['/antivicio']);
const PrivacyPolicy = lazy(telas['/privacidade']);
const Notes = lazy(telas['/notas']);
const Redes = lazy(telas['/redes']);
const Install = lazy(telas['/install']);
const Admin = lazy(telas['/admin']);
const Library = lazy(telas['/biblioteca']);
const Reader = lazy(telas['/leitor']);
const Bookmarks = lazy(telas['/marcadores']);
const AIAssistant = lazy(telas['/assistente']);
const Rotina = lazy(telas['/rotina']);
const LembretesRotina = lazy(() => import('./rotina/components/LembretesRotina'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      networkMode: "offlineFirst",
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

function AuthenticatedRotinaReminders() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Suspense fallback={null}>
      <LembretesRotina />
    </Suspense>
  );
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
          <Route path="/rotina" element={<Rotina />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/notas" element={<Notes />} />
          <Route path="/biblioteca" element={<Library />} />
          <Route path="/leitor/:id" element={<Reader />} />
          <Route path="/marcadores" element={<Bookmarks />} />
          <Route path="/assistente" element={<AIAssistant />} />
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
        <FcmForegroundListener />
        <AuthenticatedRotinaReminders />
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: createIdbPersister(), maxAge: 7 * 24 * 60 * 60 * 1000, buster: "v1" }}
    >
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  </ErrorBoundary>
);

export default App;
