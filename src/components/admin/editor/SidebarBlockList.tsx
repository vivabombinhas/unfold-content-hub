 import React from "react";
 import { cn } from "@/lib/utils";
 import { 
   Plus, 
   GripVertical, 
   Eye, 
   EyeOff, 
   Trash2,
   Settings2,
   Box,
   Download
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { BLOCK_LABELS, type BlockType } from "@/types/blocks";
 import {
   DndContext,
   closestCenter,
   PointerSensor,
   useSensor,
   useSensors,
   type DragEndEvent,
 } from "@dnd-kit/core";
 import {
   SortableContext,
   arrayMove,
   useSortable,
   verticalListSortingStrategy,
 } from "@dnd-kit/sortable";
 import { CSS } from "@dnd-kit/utilities";
 
 interface SidebarBlockListProps {
   blocks: any[];
   selectedId: string | null;
   onSelect: (id: string | null) => void;
   onToggle: (id: string, enabled: boolean) => void;
   onRemove: (id: string) => void;
   onDragEnd: (event: DragEndEvent) => void;
   onAddBlock: (type: BlockType) => void;
   onImportBlock: () => void;
   isCollapsed: boolean;
   allBlockTypes: BlockType[];
   showAddMenu: boolean;
   setShowAddMenu: (v: boolean) => void;
 }
 
 export function SidebarBlockList({
   blocks,
   selectedId,
   onSelect,
   onToggle,
   onRemove,
   onDragEnd,
   onAddBlock,
   onImportBlock,
   isCollapsed,
   allBlockTypes,
   showAddMenu,
   setShowAddMenu
 }: SidebarBlockListProps) {
   const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
 
   return (
     <div className="flex flex-col h-full py-6">
       <div className={cn("px-6 mb-8 flex items-center justify-between", isCollapsed && "px-4 justify-center")}>
         {!isCollapsed ? (
           <>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Estrutura</h2>
             <Button variant="ghost" size="icon" className="size-6 text-white/40 hover:text-white" onClick={() => onSelect(null)}>
               <Settings2 className="size-3.5" />
             </Button>
           </>
         ) : (
           <Box className="size-5 text-white/40" />
         )}
       </div>
 
       <div className="flex-1 px-3 space-y-1">
         <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
           <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
             {blocks.map((b) => (
               <SortableItem 
                 key={b.id} 
                 block={b} 
                 isSelected={b.id === selectedId} 
                 isCollapsed={isCollapsed}
                 onSelect={() => onSelect(b.id)}
                 onToggle={() => onToggle(b.id, !b.enabled)}
                 onRemove={() => onRemove(b.id)}
               />
             ))}
           </SortableContext>
         </DndContext>
       </div>
 
       <div className="mt-auto px-4 space-y-2">
         <div className="relative">
           {showAddMenu && !isCollapsed && (
             <div className="absolute bottom-full left-0 w-full mb-2 p-1 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto animate-in slide-in-from-bottom-2 duration-200">
               {allBlockTypes.map((t) => (
                 <button
                   key={t}
                   onClick={() => onAddBlock(t)}
                    className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
                 >
                   {BLOCK_LABELS[t]}
                 </button>
               ))}
             </div>
           )}
           <Button 
             variant="outline" 
             size={isCollapsed ? "icon" : "sm"} 
             className={cn(
               "w-full border-white/5 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-all active:scale-95",
               isCollapsed && "size-10"
             )}
             onClick={() => setShowAddMenu(!showAddMenu)}
           >
             <Plus className={cn("size-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && <span className="text-sm font-bold">Adicionar</span>}
           </Button>
         </div>
         <Button 
           variant="ghost" 
           size={isCollapsed ? "icon" : "sm"} 
           className={cn(
             "w-full text-white/40 hover:text-white rounded-xl transition-all",
             isCollapsed && "size-10"
           )}
           onClick={onImportBlock}
         >
           <Download className={cn("size-4", !isCollapsed && "mr-2")} />
            {!isCollapsed && <span className="text-sm font-bold">Importar</span>}
         </Button>
       </div>
     </div>
   );
 }
 
 function SortableItem({ block, isSelected, isCollapsed, onSelect, onToggle, onRemove }: any) {
   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
   
   const style = {
     transform: CSS.Transform.toString(transform),
     transition,
     zIndex: isDragging ? 50 : undefined,
     opacity: isDragging ? 0.5 : 1,
   };
 
   return (
     <div
       ref={setNodeRef}
       style={style}
       className={cn(
          "group relative flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer",
          isSelected ? "bg-white/10 text-white shadow-sm" : "text-white hover:bg-white/[0.04] transition-colors",
         !block.enabled && "opacity-50 grayscale",
         isCollapsed ? "justify-center p-2" : "px-3 py-2.5"
       )}
       onClick={onSelect}
     >
       <div {...attributes} {...listeners} className={cn("cursor-grab active:cursor-grabbing", isCollapsed ? "absolute -left-1 opacity-0 group-hover:opacity-100 transition-opacity" : "")}>
         <GripVertical className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
       </div>
       
        <div className="flex-1 min-w-0 flex items-center gap-3.5">
          <div className={cn("size-2.5 rounded-full shrink-0 transition-colors", isSelected ? "bg-brand-gold shadow-[0_0_10px_rgba(209,180,111,0.6)]" : "bg-white/20")} />
         {!isCollapsed && (
            <span className="text-sm font-bold truncate tracking-tight">
             {BLOCK_LABELS[block.type as BlockType] || block.type}
           </span>
         )}
       </div>
 
       {!isCollapsed && (
         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={(e) => { e.stopPropagation(); onToggle(); }}
             className="p-1 hover:text-brand-gold transition-colors"
           >
             {block.enabled ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); onRemove(); }}
             className="p-1 hover:text-red-400 transition-colors"
           >
             <Trash2 className="size-3" />
           </button>
         </div>
       )}
       
       {isCollapsed && isSelected && (
         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand-gold rounded-full" />
       )}
     </div>
   );
 }