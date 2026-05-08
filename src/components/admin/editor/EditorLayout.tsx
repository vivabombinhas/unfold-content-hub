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
 }
 
 export function EditorLayout({ 
   sidebar, 
   preview, 
   drawer, 
   topbar,
   isDrawerOpen,
   onCloseDrawer,
   isSidebarCollapsed,
   setIsSidebarCollapsed
 }: EditorLayoutProps) {
   const [isFocusMode, setIsFocusMode] = useState(false);
   const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
 
   return (
     <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0A0A0A] text-brand-text-light font-sans selection:bg-brand-gold/30">
       {/* Topbar */}
       <div className="z-50 shrink-0">
         {topbar}
       </div>
 
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