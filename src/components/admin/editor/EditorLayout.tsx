 import React, { useState } from "react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
 import { 
   ChevronLeft, 
   ChevronRight, 
   Maximize2, 
   Minimize2, 
   Monitor,
   Smartphone,
   Tablet,
   Home,
   FileText,
   Images,
   MessageCircle,
   Quote,
   Bot,
   GraduationCap,
   Settings,
   LogOut,
   ChevronDown
 } from "lucide-react";
 import { Link, useLocation } from "react-router-dom";
 import { useAuth } from "@/hooks/use-auth";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
   DropdownMenuSeparator,
 } from "@/components/ui/dropdown-menu";
 
 interface EditorLayoutProps {
   sidebar: React.ReactNode;
   preview: React.ReactNode;
   drawer: React.ReactNode;
   topbar: React.ReactNode;
   isDrawerOpen: boolean;
   onCloseDrawer: () => void;
   isSidebarCollapsed: boolean;
   setIsSidebarCollapsed: (v: boolean) => void;
   title?: string;
 }
 
 export function EditorLayout({ 
   sidebar, 
   preview, 
   drawer, 
   topbar,
   isDrawerOpen,
   onCloseDrawer,
   isSidebarCollapsed,
   setIsSidebarCollapsed,
   title
 }: EditorLayoutProps) {
   const [isFocusMode, setIsFocusMode] = useState(false);
   const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
   const { signOut } = useAuth();
   const location = useLocation();
 
   const NAV = [
     { to: "/admin", label: "Dashboard", icon: Home },
     { to: "/admin/paginas", label: "Páginas", icon: FileText },
     { to: "/admin/casos", label: "Casos clínicos", icon: Images },
     { to: "/admin/faqs", label: "FAQ", icon: MessageCircle },
     { to: "/admin/depoimentos", label: "Depoimentos", icon: Quote },
     { to: "/admin/ia-opinions", label: "IA", icon: Bot },
     { to: "/admin/cursos", label: "Cursos", icon: GraduationCap },
     { to: "/admin/configuracoes", label: "Ajustes", icon: Settings },
   ];
 
   const activeNav = NAV.find(n => location.pathname.startsWith(n.to) && n.to !== "/admin") || NAV[0];
 
   return (
     <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0A0A0A] text-brand-text-light font-sans selection:bg-brand-gold/30">
       {/* Global Topbar / Navigation */}
       <header className="h-[56px] border-b border-white/5 bg-[#0F0F0F] px-4 flex items-center justify-between shrink-0 z-[70] shadow-2xl">
         <div className="flex items-center gap-4">
           <Link to="/admin" className="flex items-center gap-2 mr-4 group text-brand-text-light hover:text-white transition-colors">
             <div className="size-7 rounded-lg bg-brand-gold flex items-center justify-center shadow-[0_0_15px_rgba(209,180,111,0.3)] transition-transform group-hover:scale-105">
               <Home className="size-4 text-brand-green" strokeWidth={2.5} />
             </div>
             <span className="text-sm font-bold tracking-tight text-white/90 hidden md:block">Estética Batel</span>
           </Link>
 
           {/* Floating Nav Menu */}
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" className="h-9 px-3 gap-2 bg-white/5 border border-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl">
                 <activeNav.icon className="size-4 text-brand-gold" />
                 <span className="text-xs font-medium">{activeNav.label}</span>
                 <ChevronDown className="size-3 opacity-50" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="start" className="w-56 bg-[#1A1A1A] border-white/10 rounded-xl p-2 shadow-2xl z-[80]">
               {NAV.map((item) => (
                 <DropdownMenuItem key={item.to} asChild className="rounded-lg mb-0.5">
                   <Link 
                     to={item.to} 
                     className={cn(
                       "flex items-center gap-3 px-3 py-2 text-xs transition-colors cursor-pointer w-full",
                       location.pathname === item.to ? "bg-brand-gold/10 text-brand-gold" : "text-white/60 hover:bg-white/5 hover:text-white"
                     )}
                   >
                     <item.icon className={cn("size-4", location.pathname === item.to ? "text-brand-gold" : "text-white/40")} />
                     {item.label}
                   </Link>
                 </DropdownMenuItem>
               ))}
               <DropdownMenuSeparator className="bg-white/5 my-2" />
               <DropdownMenuItem onClick={signOut} className="rounded-lg text-red-400 focus:text-red-400 focus:bg-red-400/10 cursor-pointer">
                 <LogOut className="size-4 mr-3" />
                 <span className="text-xs font-medium">Sair do Admin</span>
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
 
           <div className="w-px h-4 bg-white/10 mx-2" />
           
           <div className="flex flex-col">
             <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold leading-none mb-1">Editando Página</span>
             <span className="text-sm font-semibold text-white/90 truncate max-w-[200px] leading-none">{title}</span>
           </div>
         </div>
 
         <div className="flex items-center gap-2">
           {topbar}
         </div>
       </header>

       <div className="flex flex-1 overflow-hidden relative">
         {/* Sidebar Esquerda - Colapsável */}
         {!isFocusMode && (
           <aside 
             className={cn(
               "relative z-40 flex flex-col border-r border-white/5 bg-[#0F0F0F]/80 backdrop-blur-xl transition-all duration-300 ease-in-out",
               isSidebarCollapsed ? "w-[60px]" : "w-[300px]"
             )}
           >
             <div className="flex-1 overflow-y-auto overflow-x-hidden">
               {sidebar}
             </div>
             
             {/* Toggle Collapse */}
             <button 
               onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
               className="absolute -right-3 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center bg-brand-gold text-brand-green rounded-full shadow-lg border border-white/10 hover:scale-110 transition-transform z-50"
             >
               {isSidebarCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
             </button>
           </aside>
         )}
 
         {/* Área Central - Preview Canvas */}
         <main className="flex-1 relative flex flex-col bg-[#050505] overflow-hidden">
           {/* Toolbar Interna (Floating) */}
           <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1 bg-[#1A1A1A]/80 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
             <Button 
               variant="ghost" 
               size="icon" 
               className={cn("size-8 rounded-full", viewMode === "desktop" && "bg-white/10 text-brand-gold")}
               onClick={() => setViewMode("desktop")}
             >
               <Monitor className="size-4" />
             </Button>
             <Button 
               variant="ghost" 
               size="icon" 
               className={cn("size-8 rounded-full", viewMode === "tablet" && "bg-white/10 text-brand-gold")}
               onClick={() => setViewMode("tablet")}
             >
               <Tablet className="size-4" />
             </Button>
             <Button 
               variant="ghost" 
               size="icon" 
               className={cn("size-8 rounded-full", viewMode === "mobile" && "bg-white/10 text-brand-gold")}
               onClick={() => setViewMode("mobile")}
             >
               <Smartphone className="size-4" />
             </Button>
             <div className="w-px h-4 bg-white/10 mx-1" />
             <Button 
               variant="ghost" 
               size="icon" 
               className={cn("size-8 rounded-full", isFocusMode && "bg-white/10 text-brand-gold")}
               onClick={() => setIsFocusMode(!isFocusMode)}
               title={isFocusMode ? "Sair do Modo Foco" : "Modo Foco"}
             >
               {isFocusMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
             </Button>
           </div>
 
           {/* Canvas Container */}
           <div className="flex-1 flex items-center justify-center p-8 lg:p-12 xl:p-16 overflow-hidden">
             <div 
               className={cn(
                 "relative h-full bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden rounded-md",
                 viewMode === "desktop" ? "w-full" : 
                 viewMode === "tablet" ? "w-[768px]" : "w-[375px]"
               )}
             >
               {preview}
             </div>
           </div>
         </main>
 
         {/* Drawer de Edição (Overlay Flutuante) */}
         <div 
           className={cn(
             "fixed top-[64px] bottom-0 right-0 z-[60] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
             isDrawerOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
           )}
           style={{ width: "450px" }}
         >
           <div className="h-full w-full bg-[#0F0F0F]/95 backdrop-blur-2xl border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.3)] flex flex-col">
             <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
               <h3 className="text-sm font-medium tracking-tight text-white/90">Editar Bloco</h3>
               <Button variant="ghost" size="icon" onClick={onCloseDrawer} className="hover:bg-white/5">
                 <ChevronRight className="size-4" />
               </Button>
             </div>
             <div className="flex-1 overflow-y-auto">
               {drawer}
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }