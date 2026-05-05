 import React, { useMemo } from "react";
 import * as diff from "diff";
 import { cn } from "@/lib/utils";
 import { Label } from "@/components/ui/label";
 
 import { Button } from "@/components/ui/button";
 import { Check } from "lucide-react";
 
 interface DiffViewerProps {
   oldText: string;
   newText: string;
   className?: string;
   onSelectText?: (text: string) => void;
   selectedText?: string;
 }
 
 export function DiffViewer({ oldText, newText, className, onSelectText, selectedText }: DiffViewerProps) {
   const diffResult = useMemo(() => {
     return diff.diffWords(oldText, newText);
   }, [oldText, newText]);
 
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
 
       <div className="space-y-2">
         <div className="flex items-center justify-between">
           <Label className="text-[10px] text-brand-text-muted uppercase tracking-wider">Texto Processado (IA)</Label>
           {onSelectText && (
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
     </div>
   );
 }