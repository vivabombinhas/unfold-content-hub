 export const BATEL_COMPLIANCE = {
   forbidden_terms: [
     { pattern: /médic[oa]/i, replacement: "profissional", message: "Use 'profissional' ou 'especialista' em vez de médico(a) para a equipe geral." },
     { pattern: /dermatologist[oa]/i, replacement: "especialista", message: "Evite o termo dermatologista a menos que se refira especificamente à Dra. Daniele." },
     { pattern: /garanti[ao]/i, replacement: "expectativa de resultado", message: "Nunca prometa resultados garantidos." },
     { pattern: /cura/i, replacement: "tratamento", message: "Não use o termo 'cura' para procedimentos estéticos." }
   ],
   required_terms: [
     { term: "Dra. Daniele Florencio", type: "RT_NAME" },
     { term: "Estética Batel", type: "BRAND_NAME" }
   ],
   roles: {
     daniele: "Fisioterapeuta Dermatofuncional",
     clinic: "Clínica de Estética de Alta Performance"
   }
 };
 
 export function validateCompliance(content: string): { valid: boolean; warnings: string[] } {
   const warnings: string[] = [];
   
   BATEL_COMPLIANCE.forbidden_terms.forEach(({ pattern, message }) => {
     if (pattern.test(content)) {
       warnings.push(message);
     }
   });
   
   return {
     valid: warnings.length === 0,
     warnings
   };
 }