 import React, { useMemo } from "react";
 import * as diff from "diff";
 import { cn } from "@/lib/utils";
 import { Label } from "@/components/ui/label";
 
 interface DiffViewerProps {
   oldText: string;
   newText: string;
   className?: string;
 }
 
 export function DiffViewer({ oldText, newText, className }: DiffViewerProps) {
   const diffResult = useMemo(() => {
     return diff.diffWords(oldText, newText);
   }, [oldText, newText]);
 
   return (
     <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
       <div className="space-y-2">
         <Label className="text-[10px] text-brand-text-muted uppercase tracking-wider">Texto Original (Pasted)</Label>
         <div className="p-3 bg-brand-black/40 border border-brand-bordeaux/20 rounded-md text-[11px] font-mono whitespace-pre-wrap leading-relaxed min-h-[120px]">
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
         <Label className="text-[10px] text-brand-text-muted uppercase tracking-wider">Texto Processado (IA)</Label>
         <div className="p-3 bg-brand-black/40 border border-brand-gold/20 rounded-md text-[11px] font-mono whitespace-pre-wrap leading-relaxed min-h-[120px]">
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