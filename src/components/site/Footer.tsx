import { Phone, Mail, MapPin, Instagram } from "lucide-react";
import { Medal } from "./Medal";

export const Footer = ({ documents = [] }: { documents?: any[] }) => {
  const tcle = documents.find(d => d.document_type === "tcle");
  const tech = documents.find(d => d.document_type === "technical_differential");

  return (
    <footer className="bg-brand-black text-brand-text-soft border-t border-brand-gold/15 relative z-[2]">
      <div className="container-editorial section-pad">
        <div className="grid lg:grid-cols-[1.2fr_1fr_1fr_1fr] gap-12">
          <div>
            <Medal size={64} />
            <h3 className="font-display text-2xl mt-5 text-brand-text-light">Clínica de Estética Batel</h3>
            <p className="text-sm mt-3 leading-relaxed">
              Há trinta anos no Batel, atendendo pacientes que valorizam discrição, técnica e resultados que envelhecem bem.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-body font-semibold uppercase tracking-[0.22em] text-brand-gold mb-5">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3"><Phone className="size-4 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.5} /> (41) 9999-9999</li>
              <li className="flex items-start gap-3"><Mail className="size-4 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.5} /> contato@esteticabatel.com.br</li>
              <li className="flex items-start gap-3"><Instagram className="size-4 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.5} /> @esteticabatel</li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-body font-semibold uppercase tracking-[0.22em] text-brand-gold mb-5">Endereço</h4>
            <p className="flex items-start gap-3 text-sm">
              <MapPin className="size-4 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>
                Rua Comendador Araújo, 000<br />
                Batel · Curitiba/PR<br />
                CEP 80420-000
              </span>
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-body font-semibold uppercase tracking-[0.22em] text-brand-gold mb-5">Institucional</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-brand-gold transition-colors">Alvará Sanitário</a></li>
              <li><a href="#" className="hover:text-brand-gold transition-colors">CNPJ: 00.000.000/0001-00</a></li>
              <li><a href="#" className="hover:text-brand-gold transition-colors">Política de Privacidade</a></li>
              {tcle && (
                <li>
                  <a href={`/documentos/tcle/${tcle.slug}`} target="_blank" className="hover:text-brand-gold transition-colors font-bold">
                    TCLE · Consentimento
                  </a>
                </li>
              )}
              {tech && (
                <li>
                  <a href={`/documentos/diferenciais/${tech.slug}`} target="_blank" className="hover:text-brand-gold transition-colors font-bold">
                    Diferenciais Técnicos
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-brand-gold/10 mt-14 pt-7 flex flex-col md:flex-row justify-between gap-4 text-[11px] text-brand-text-muted">
          <p>
            <strong className="text-brand-text-soft">Responsável Técnica:</strong> Dra. Daniele Florencio · CRBM 8242 PR
          </p>
          <p>© {new Date().getFullYear()} Estética Batel · Todos os direitos reservados</p>
        </div>
      </div>
    </footer>
  );
};