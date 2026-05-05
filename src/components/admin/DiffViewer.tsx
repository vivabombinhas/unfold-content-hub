 import React, { useMemo, useState, useEffect } from "react";
 import * as diff from "diff";
 import { cn } from "@/lib/utils";
 import { Label } from "@/components/ui/label";
 
 import { Button } from "@/components/ui/button";
 import { Check, Edit2, Save, X } from "lucide-react";
 import { Textarea } from "@/components/ui/textarea";
 
 interface DiffViewerProps {
   oldText: string;
   newText: string;
   className?: string;
   onSelectText?: (text: string) => void;
   selectedText?: string;
 }
 
 export function DiffViewer({ oldText, newText, className, onSelectText, selectedText }: DiffViewerProps) {
   const [isEditing, setIsEditing] = useState(false);
   const [editText, setEditText] = useState(selectedText || newText);
 
   useEffect(() => {
     if (!isEditing) {
       setEditText(selectedText || newText);
     }
   }, [selectedText, newText, isEditing]);
 
   const currentDisplayTarget = selectedText || newText;
 
   const diffResult = useMemo(() => {
     return diff.diffWords(oldText, currentDisplayTarget);
   }, [oldText, currentDisplayTarget]);
 
   const isCustom = selectedText !== undefined && selectedText !== oldText && selectedText !== newText;
 
   return (
     <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
       <div className="space-y-2">
         <div className="flex items-center justify-between">
           <Label className="text-[10px] text-brand-text-muted uppercase tracking-wider">Texto Original (Pasted)</Label>
           {onSelectText && (
             <Button 
               size="sm" 
               variant="outline" 
               className={cn(
                 "h-6 px-2 text-[9px] uppercase tracking-tighter transition-all",
                 selectedText === oldText ? "bg-brand-bordeaux/20 border-brand-bordeaux text-brand-text-light" : "border-brand-bordeaux/30 text-brand-bordeaux hover:bg-brand-bordeaux/10"
               )}
               onClick={() => onSelectText(oldText)}
             >
               {selectedText === oldText ? <Check className="size-2.5 mr-1" /> : null}
               Manter Original
             </Button>
           )}
         </div>
         <div className={cn(
           "p-3 bg-brand-black/40 border rounded-md text-[11px] font-mono whitespace-pre-wrap leading-relaxed min-h-[120px] transition-colors",
           selectedText === oldText ? "border-brand-bordeaux/50 ring-1 ring-brand-bordeaux/20" : "border-brand-bordeaux/20"
         )}>
           {diffResult.map((part, index) => {
             if (part.added) return null;
             return (
               <span
                 key={index}
                 className={cn(
                   part.removed ? "bg-brand-bordeaux/30 text-brand-text-light px-0.5 rounded line-through" : "text-brand-text-muted"
                 )}
               >
                 {part.value}
               </span>
             );
           })}
         </div>
       </div>
 
       {isEditing ? (
         <div className="space-y-2 flex flex-col h-full">
           <div className="flex items-center justify-between">
             <Label className="text-[10px] text-brand-gold uppercase tracking-wider font-bold">Modo de Edição Manual</Label>
             <div className="flex gap-2">
               <Button 
                 size="sm" 
                 variant="ghost"
                 className="h-6 px-2 text-[9px] uppercase tracking-tighter text-brand-text-muted hover:text-brand-bordeaux"
                 onClick={() => setIsEditing(false)}
               >
                 <X className="size-2.5 mr-1" />
                 Cancelar
               </Button>
               <Button 
                 size="sm" 
                 className="h-6 px-2 text-[9px] uppercase tracking-tighter bg-brand-gold text-brand-green font-bold"
                 onClick={() => {
                   onSelectText?.(editText);
                   setIsEditing(false);
                 }}
               >
                 <Save className="size-2.5 mr-1" />
                 Salvar Edição
               </Button>
             </div>
           </div>
           <Textarea 
             value={editText}
             onChange={(e) => setEditText(e.target.value)}
             className="flex-1 bg-brand-black/60 border-brand-gold/30 text-[11px] font-mono leading-relaxed min-h-[120px] focus-visible:ring-brand-gold/20"
             placeholder="Edite o conteúdo aqui..."
           />
         </div>
       ) : (
         <div className="space-y-2">
           <div className="flex items-center justify-between">
           <Label className="text-[10px] text-brand-text-muted uppercase tracking-wider">
             {isCustom ? "Texto Personalizado" : "Texto Processado (IA)"}
           </Label>
             <div className="flex gap-2">
               <Button 
                 size="sm" 
                 variant="outline"
                 className="h-6 px-2 text-[9px] uppercase tracking-tighter border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10"
                 onClick={() => {
                   setEditText(selectedText || newText);
                   setIsEditing(true);
                 }}
               >
                 <Edit2 className="size-2.5 mr-1" />
                 Editar
               </Button>
               {onSelectText && !isCustom && (
                 <Button 
                   size="sm" 
                   className={cn(
                     "h-6 px-2 text-[9px] uppercase tracking-tighter transition-all",
                     selectedText === newText ? "bg-brand-gold text-brand-green font-bold" : "bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20"
                   )}
                   onClick={() => onSelectText(newText)}
                 >
                   {selectedText === newText ? <Check className="size-2.5 mr-1" /> : null}
                   Aplicar IA
                 </Button>
               )}
               {isCustom && (
                 <div className="flex items-center bg-brand-gold/20 px-2 py-0.5 rounded border border-brand-gold/30">
                   <Check className="size-2.5 mr-1 text-brand-gold" />
                   <span className="text-[9px] text-brand-gold uppercase font-bold">Personalizado</span>
                 </div>
               )}
             </div>
           </div>
           <div className={cn(
             "p-3 bg-brand-black/40 border rounded-md text-[11px] font-mono whitespace-pre-wrap leading-relaxed min-h-[120px] transition-colors",
             selectedText === newText ? "border-brand-gold/50 ring-1 ring-brand-gold/20" : "border-brand-gold/20"
           )}>
             {diffResult.map((part, index) => {
               if (part.removed) return null;
               return (
                 <span
                   key={index}
                   className={cn(
                     part.added ? "bg-brand-gold/20 text-brand-gold px-0.5 rounded font-bold" : "text-brand-text-light"
                   )}
                 >
                   {part.value}
                 </span>
               );
             })}
           </div>
         </div>
       )}
     </div>
   );
 }