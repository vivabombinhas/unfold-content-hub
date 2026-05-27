import { Phone, MessageCircle, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Seção fixa de localização/mapa.
 *
 * Renderizada AUTOMATICAMENTE em todas as páginas públicas (mãe + filhas),
 * logo antes do Footer. Não é um `block_type` — é institucional/global.
 * Lê de `site_settings`; se faltar campo, usa fallback aprovado da página-mãe.
 *
 * Mantém o visual idêntico ao bloco "Onde estamos / No coração do Batel"
 * que vivia hardcoded em src/pages/Index.tsx.
 */

interface SiteSettings {
  whatsapp: string | null;
  phone: string | null;
  address: string | null;
  cep: string | null;
  google_maps_url: string | null;
}

function googleEmbedFromUrl(url: string | null, address: string | null): string {
  // Aceita qualquer URL do Google Maps e cai num embed seguro por query string.
  const q =
    (url && url.match(/[?&]q=([^&]+)/)?.[1]) ||
    (address ? encodeURIComponent(address) : "Rua+Brigadeiro+Franco+Batel+Curitiba");
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

function waHref(wa: string | null | undefined): string {
  if (!wa) return "https://wa.me/5541999999999";
  if (wa.startsWith("http")) return wa;
  // Aceita formato "5541999999999"
  return `https://wa.me/${wa.replace(/\D/g, "")}`;
}

function telHref(phone: string | null | undefined): string {
  if (!phone) return "tel:+554199999999";
  return `tel:+${phone.replace(/\D/g, "")}`;
}

export function LocalizacaoSection({ documents = [] }: { documents?: any[] }) {
  const tcle = documents.find(d => d.document_type === "tcle");
  const tech = documents.find(d => d.document_type === "technical_differential");

  const { data } = useQuery({
    queryKey: ["site-settings-localizacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("whatsapp,phone,address,cep,google_maps_url")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SiteSettings | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const address = data?.address || "Rua Brigadeiro Franco, 2670";
  const cep = data?.cep || "80250-030";
  const phone = data?.phone || "(41) 3000-0000";
  const embedSrc = googleEmbedFromUrl(data?.google_maps_url || null, data?.address || null);

  return (
    <section id="contato" className="bg-brand-black relative z-[2]">
      <div className="container-editorial pt-16 md:pt-24 pb-10">
        <div className="grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16 items-start">
          <div className="reveal">
            <span className="eyebrow">Onde estamos</span>
            <h2 className="h-display-2 mt-5 text-balance">
              No coração do <em>Batel</em>.
            </h2>
            <span className="gold-rule mt-7" />
            <address className="mt-7 not-italic text-brand-text-soft text-base leading-[1.8]">
              {address}
              <br />
              Batel · Curitiba/PR
              <br />
              CEP {cep}
            </address>
            <div className="mt-7 space-y-3 text-sm">
              <a
                href={telHref(phone)}
                className="flex items-center gap-3 text-brand-text-light hover:text-brand-gold transition-colors"
              >
                <Phone className="size-4 text-brand-gold" strokeWidth={1.5} /> {phone}
              </a>
              <a
                href={waHref(data?.whatsapp)}
                className="flex items-center gap-3 text-brand-text-light hover:text-brand-gold transition-colors"
              >
                <MessageCircle className="size-4 text-brand-gold" strokeWidth={1.5} /> WhatsApp
              </a>
            </div>
            <div className="mt-9 pt-7 border-t border-brand-gold/15">
              <p className="text-[10px] uppercase tracking-[0.22em] text-brand-gold mb-4">
                Documentação técnica
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="#"
                  className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/5 transition-colors"
                >
                  Alvará sanitário (PDF)
                </a>
                {tech && (
                  <a
                    href={`/documentos/diferenciais/${tech.slug}`}
                    target="_blank"
                    className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/5 transition-colors font-bold"
                  >
                    Diferenciais Técnicos
                  </a>
                )}
                {tcle && (
                  <a
                    href={`/documentos/tcle/${tcle.slug}`}
                    target="_blank"
                    className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/5 transition-colors font-bold"
                  >
                    TCLE · Consentimento
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="reveal">
            <div className="aspect-[16/11] overflow-hidden border border-brand-gold/20">
              <iframe
                title="Localização da Clínica de Estética Batel"
                src={embedSrc}
                width="100%"
                height="100%"
                className="w-full h-full grayscale-[60%] contrast-[1.05]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <p className="text-xs text-brand-text-muted mt-3 flex items-center gap-2">
              <MapPin className="size-3.5 text-brand-gold" strokeWidth={1.5} />
              Estacionamento conveniado a 50 metros
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}