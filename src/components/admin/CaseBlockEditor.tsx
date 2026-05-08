 import { useState, useMemo } from "react";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { MediaInput } from "./MediaInput";
 import { 
   Plus, 
   Trash2, 
   GripVertical, 
   Library, 
   PlusCircle, 
   Search, 
   ChevronDown, 
   ChevronUp,
   Image as ImageIcon,
   Split
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { 
   DndContext, 
   closestCenter, 
   PointerSensor, 
   useSensor, 
   useSensors, 
   DragEndEvent 
 } from "@dnd-kit/core";
 import { 
   SortableContext, 
   arrayMove, 
   useSortable, 
   verticalListSortingStrategy 
 } from "@dnd-kit/sortable";
 import { CSS } from "@dnd-kit/utilities";
 
 interface CaseItem {
   source: "global" | "manual";
   case_id?: string; // para global
   title?: string;
   description?: string;
   before_url?: string;
   after_url?: string;
   image_url?: string;
   notes?: string;
   age?: string;
 }
 
 interface Props {
   items: CaseItem[];
   onChange: (items: CaseItem[]) => void;
 }
 
 export function CaseBlockEditor({ items, onChange }: Props) {
   const [showLibrary, setShowLibrary] = useState(false);
   const [search, setSearch] = useState("");
   const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
 
   const { data: pool = [] } = useQuery({
     queryKey: ["cases-pool"],
     queryFn: async () => {
       const { data, error } = await supabase.from("cases").select("*").order("position");
       if (error) throw error;
       return data || [];
     }
   });
 
   const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
 
   const filteredPool = useMemo(() => {
     return pool.filter(p => 
       p.area.toLowerCase().includes(search.toLowerCase()) || 
       (p.notes || "").toLowerCase().includes(search.toLowerCase())
     );
   }, [pool, search]);
 
   function handleDragEnd(event: DragEndEvent) {
     const { active, over } = event;
     if (over && active.id !== over.id) {
       const oldIndex = items.findIndex((_, i) => `item-${i}` === active.id);
       const newIndex = items.findIndex((_, i) => `item-${i}` === over.id);
       onChange(arrayMove(items, oldIndex, newIndex));
     }
   }
 
   function addItem(item: CaseItem) {
     onChange([...items, item]);
     setShowLibrary(false);
     setExpandedIdx(items.length); // Expand the new item
   }
 
   function updateItem(idx: number, patch: Partial<CaseItem>) {
     const next = [...items];
     next[idx] = { ...next[idx], ...patch };
     onChange(next);
   }
 
   function removeItem(idx: number) {
     onChange(items.filter((_, i) => i !== idx));
     if (expandedIdx === idx) setExpandedIdx(null);
   }
 
   return (
     <div className="space-y-4">
       <div className="flex gap-2">
         <Button 
           variant="outline" 
           size="sm" 
           className="flex-1 bg-brand-gold/5 border-brand-gold/20 text-brand-gold"
           onClick={() => setShowLibrary(!showLibrary)}
         >
           <Library className="size-3.5 mr-2" />
           Biblioteca Global
         </Button>
         <Button 
           variant="outline" 
           size="sm" 
           className="flex-1"
           onClick={() => addItem({ source: "manual", title: "Novo caso manual", image_url: "" })}
         >
           <PlusCircle className="size-3.5 mr-2" />
           Adicionar Manual
         </Button>
       </div>
 
       {showLibrary && (
         <div className="border border-brand-gold/20 bg-brand-black/40 rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
           <div className="flex items-center gap-2 px-2 py-1 bg-brand-black/60 rounded border border-brand-gold/10">
             <Search className="size-3.5 text-brand-text-muted" />
             <input 
               placeholder="Buscar na biblioteca..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="bg-transparent border-none text-xs text-brand-text-light focus:outline-none flex-1"
             />
           </div>
           <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
             {filteredPool.map(p => (
               <button
                 key={p.id}
                 onClick={() => addItem({ source: "global", case_id: p.id })}
                 className="flex flex-col text-left group border border-brand-gold/10 bg-brand-black/20 hover:border-brand-gold/40 transition-colors overflow-hidden rounded"
               >
                 <div className="aspect-video bg-brand-graphite relative">
                   <img src={p.cover_url || ""} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                 </div>
                 <div className="p-1.5">
                   <p className="text-[10px] font-bold text-brand-text-light truncate">{p.area}</p>
                   <p className="text-[8px] text-brand-text-muted uppercase tracking-tighter">{p.age || 'Global'}</p>
                 </div>
               </button>
             ))}
           </div>
         </div>
       )}
 
       <div className="space-y-2">
         <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
           <SortableContext items={items.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
             {items.map((item, idx) => (
               <SortableItem 
                 key={`item-${idx}`} 
                 id={`item-${idx}`} 
                 item={item} 
                 idx={idx}
                 expanded={expandedIdx === idx}
                 onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                 onUpdate={(p) => updateItem(idx, p)}
                 onRemove={() => removeItem(idx)}
                 pool={pool}
               />
             ))}
           </SortableContext>
         </DndContext>
       </div>
 
       {items.length === 0 && !showLibrary && (
         <div className="text-center py-8 border-2 border-dashed border-brand-gold/10 rounded-lg">
           <p className="text-xs text-brand-text-muted italic">Nenhum caso selecionado.</p>
         </div>
       )}
     </div>
   );
 }
 
 function SortableItem({ id, item, idx, expanded, onToggle, onUpdate, onRemove, pool }: any) {
   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
   
   const style = {
     transform: CSS.Translate.toString(transform),
     transition,
     zIndex: isDragging ? 50 : undefined,
   };
 
   const poolItem = item.source === "global" ? pool.find((p: any) => p.id === item.case_id) : null;
   const title = item.source === "global" ? poolItem?.area || "Caso Global" : item.title || "Caso Manual";
   const subtitle = item.source === "global" ? "Biblioteca" : "Específico da página";
   const thumb = item.source === "global" ? poolItem?.cover_url : (item.image_url || item.before_url);
 
   return (
     <div 
       ref={setNodeRef} 
       style={style} 
       className={cn(
         "border rounded-md transition-colors",
         expanded ? "border-brand-gold/30 bg-brand-black/40" : "border-brand-gold/10 bg-brand-graphite/10 hover:border-brand-gold/20",
         isDragging && "opacity-50"
       )}
     >
       <div className="flex items-center gap-2 p-2 group">
         <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-brand-text-muted hover:text-brand-gold">
           <GripVertical className="size-4" />
         </button>
         
         <div className="size-8 rounded bg-brand-black/60 flex items-center justify-center overflow-hidden border border-brand-gold/10 shrink-0">
           {thumb ? (
             <img src={thumb} alt="" className="w-full h-full object-cover" />
           ) : (
             <ImageIcon className="size-3.5 text-brand-text-muted" />
           )}
         </div>
 
         <div className="flex-1 min-w-0" onClick={onToggle}>
           <p className="text-[11px] font-bold text-brand-text-light truncate">{title}</p>
           <p className="text-[9px] uppercase tracking-tighter text-brand-text-muted">{subtitle}</p>
         </div>
 
         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <Button size="icon" variant="ghost" className="size-7 text-brand-text-muted hover:text-brand-bordeaux" onClick={onRemove}>
             <Trash2 className="size-3.5" />
           </Button>
           <Button size="icon" variant="ghost" className="size-7" onClick={onToggle}>
             {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
           </Button>
         </div>
       </div>
 
       {expanded && (
         <div className="p-4 pt-0 border-t border-brand-gold/10 mt-1 space-y-4 animate-in slide-in-from-top-1">
           {item.source === "manual" ? (
             <div className="space-y-4 pt-4">
               <div className="grid gap-3">
                 <div className="space-y-1.5">
                   <Label className="text-[10px] uppercase tracking-widest text-brand-text-muted">Título do Procedimento</Label>
                   <Input 
                     value={item.title || ""} 
                     onChange={e => onUpdate({ title: e.target.value })} 
                     className="h-8 text-xs bg-brand-black/40 border-brand-gold/10"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <Label className="text-[10px] uppercase tracking-widest text-brand-text-muted">Idade/Rótulo (Ex: 35 anos)</Label>
                   <Input 
                     value={item.age || ""} 
                     onChange={e => onUpdate({ age: e.target.value })} 
                     className="h-8 text-xs bg-brand-black/40 border-brand-gold/10"
                   />
                 </div>
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Split className="size-3 text-brand-gold" />
                      <span className="text-[10px] uppercase font-bold text-brand-text-muted tracking-widest">Antes/Depois</span>
                    </div>
                    <MediaInput 
                      label="Foto Antes" 
                      value={item.before_url || ""} 
                      onChange={url => onUpdate({ before_url: url })} 
                    />
                    <MediaInput 
                      label="Foto Depois" 
                      value={item.after_url || ""} 
                      onChange={url => onUpdate({ after_url: url })} 
                    />
                 </div>
                 <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ImageIcon className="size-3 text-brand-gold" />
                      <span className="text-[10px] uppercase font-bold text-brand-text-muted tracking-widest">Ou Imagem Única</span>
                    </div>
                    <MediaInput 
                      label="Capa do Caso" 
                      value={item.image_url || ""} 
                      onChange={url => onUpdate({ image_url: url })} 
                    />
                 </div>
               </div>
 
               <div className="space-y-1.5">
                 <Label className="text-[10px] uppercase tracking-widest text-brand-text-muted">Notas/Descrição</Label>
                 <Textarea 
                   value={item.notes || ""} 
                   onChange={e => onUpdate({ notes: e.target.value })} 
                   className="text-xs bg-brand-black/40 border-brand-gold/10 min-h-[80px]"
                   placeholder="Detalhes técnicos, dosagem, resultados..."
                 />
               </div>
             </div>
           ) : (
             <div className="pt-4 space-y-3">
               <p className="text-[11px] text-brand-text-muted italic">
                 Este caso está vinculado à biblioteca global. 
                 Alterações nos dados originais refletirão aqui automaticamente.
               </p>
               <div className="flex items-center gap-3 p-2 bg-brand-gold/5 border border-brand-gold/10 rounded">
                 <img src={poolItem?.cover_url || ""} alt="" className="size-12 rounded object-cover" />
                 <div>
                   <p className="text-xs font-bold text-brand-gold">{poolItem?.area}</p>
                   <p className="text-[10px] text-brand-text-muted">{poolItem?.notes?.substring(0, 50)}...</p>
                 </div>
               </div>
             </div>
           )}
         </div>
       )}
     </div>
   );
 }