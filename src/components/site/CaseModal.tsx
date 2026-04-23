import { useEffect } from "react";
import { X, Clock, Syringe, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClinicalCase } from "@/data/landing";
import { BeforeAfter } from "./BeforeAfter";
import { GoldButton } from "./GoldButton";

interface CaseModalProps {
  caseData: ClinicalCase | null;
  onClose: () => void;
}

/**
 * Cinematic fullscreen modal for clinical cases.
 * Mobile: 100% viewport. Desktop: large editorial frame.
 */
export const CaseModal = ({ caseData, onClose }: CaseModalProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (caseData) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [caseData, onClose]);

  const open = !!caseData;

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[130] transition-opacity duration-500",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full h-full md:h-auto md:max-w-6xl md:max-h-[92vh] md:my-[4vh] md:mx-auto",
          "bg-brand-graphite text-brand-text-light overflow-hidden md:rounded-sm shadow-2xl",
          "transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "scale-100" : "scale-95"
        )}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-10 size-11 grid place-items-center rounded-full bg-black/60 hover:bg-brand-gold hover:text-brand-green text-brand-text-light backdrop-blur-sm transition-colors"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>

        {caseData && (
          <div className="grid md:grid-cols-[1.1fr_1fr] h-full md:max-h-[92vh] overflow-y-auto md:overflow-hidden scrollbar-gold">
            {/* Visual side */}
            <div className="bg-brand-black md:overflow-hidden">
              {caseData.beforeAfter ? (
                <BeforeAfter
                  before={caseData.beforeAfter.before}
                  after={caseData.beforeAfter.after}
                  className="md:h-full md:aspect-auto"
                />
              ) : (
                <img
                  src={caseData.cover}
                  alt={caseData.area}
                  className="w-full h-full aspect-[4/5] md:aspect-auto object-cover"
                  loading="lazy"
                />
              )}
            </div>
            {/* Info side */}
            <div className="p-7 md:p-12 md:overflow-y-auto scrollbar-gold">
              <span className="eyebrow text-[10px]">Caso clínico documentado</span>
              <h2 className="h-display-2 mt-3 text-balance">{caseData.area}</h2>
              <p className="text-brand-text-soft mt-2 text-sm font-body uppercase tracking-[0.18em]">
                {caseData.age}
              </p>
              <span className="gold-rule mt-6" />

              <div className="mt-7 space-y-5 text-[15px] leading-[1.75] text-brand-text-soft">
                <p>{caseData.notes}</p>
              </div>

              <dl className="mt-9 grid gap-4 text-sm">
                <div className="flex items-start gap-4 pb-4 border-b border-brand-gold/15">
                  <Syringe className="size-4 text-brand-gold mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <dt className="text-[10px] font-body uppercase tracking-[0.22em] text-brand-text-muted">Dosagem</dt>
                    <dd className="mt-1 text-brand-text-light">{caseData.dosage}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-brand-gold/15">
                  <Clock className="size-4 text-brand-gold mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <dt className="text-[10px] font-body uppercase tracking-[0.22em] text-brand-text-muted">Tempo de resultado</dt>
                    <dd className="mt-1 text-brand-text-light">{caseData.duration}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-brand-gold/15">
                  <FileText className="size-4 text-brand-gold mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <dt className="text-[10px] font-body uppercase tracking-[0.22em] text-brand-text-muted">Toxina utilizada</dt>
                    <dd className="mt-1 text-brand-text-light">{caseData.toxin}</dd>
                  </div>
                </div>
              </dl>

              <GoldButton
                as="a"
                href="https://wa.me/5541999999999"
                className="mt-9 w-full"
                withArrow
              >
                Quero um protocolo como este
              </GoldButton>
              <p className="text-[11px] text-brand-text-muted mt-4 text-center">
                Resultados variam conforme avaliação individual.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};