 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import PublicPage from "./pages/PublicPage.tsx";
import { AuthProvider } from "@/hooks/use-auth";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
 import PagesList from "./pages/admin/PagesList.tsx";
 import ControlTower from "./pages/admin/ControlTower.tsx";
 import Faqs from "./pages/admin/Faqs.tsx";
import Reviews from "./pages/admin/Reviews.tsx";
 import Courses from "./pages/admin/Courses.tsx";
 import Cases from "./pages/admin/Cases.tsx";
import PageEditor from "./pages/admin/PageEditor.tsx";
 import NewPageFromTopic from "./pages/admin/NewPageFromTopic.tsx";
 import BatchPageCreation from "./pages/admin/BatchPageCreation.tsx";
import PageCreationWizard from "./pages/admin/PageCreationWizard.tsx";
import Settings from "./pages/admin/Settings.tsx";

const queryClient = new QueryClient();

 const App = () => (
   <QueryClientProvider client={queryClient}>
     <HelmetProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/p/:slug" element={<PublicPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="torre-de-controle" element={<ControlTower />} />
                <Route path="paginas" element={<PagesList />} />
                <Route path="paginas/nova" element={<PageCreationWizard />} />
                <Route path="paginas/lote" element={<BatchPageCreation />} />
                <Route path="paginas/nova-legado" element={<NewPageFromTopic />} />
                <Route path="paginas/:slug" element={<PageEditor />} />
                <Route path="faqs" element={<Faqs />} />
                <Route path="depoimentos" element={<Reviews />} />
                <Route path="casos" element={<Cases />} />
                <Route path="ia-opinions" element={<div className="p-8 text-brand-text-muted">Página de Opiniões de IAs em desenvolvimento...</div>} />
                <Route path="cursos" element={<Courses />} />
                <Route path="configuracoes" element={<Settings />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
     </HelmetProvider>
   </QueryClientProvider>
 );

export default App;
