import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pools = coleções compartilhadas entre páginas (casos, depoimentos,
 * opiniões de IA, cursos, FAQs). Carregados uma única vez no <PublicPage>
 * e disponibilizados via <PoolsProvider> para os blocos coletivos.
 */

export interface PoolCase {
  id: string;
  slug: string;
  area: string;
  age: string | null;
  cover_url: string | null;
  before_url: string | null;
  after_url: string | null;
  notes: string | null;
  dosage: string | null;
  duration: string | null;
  toxin: string | null;
  highlight: boolean;
  position: number;
  gallery: { src?: string; caption?: string }[];
}

export interface PoolReview {
  id: string;
  name: string;
  rating: number;
  date_label: string | null;
  text: string;
}

export interface PoolAIOpinion {
  id: string;
  ai_name: string;
  company: string | null;
  quote: string;
}

export interface PoolCourse {
  id: string;
  title: string;
  audience: string | null;
  duration: string | null;
  description: string | null;
}

export interface PoolFaq {
  id: string;
  question: string;
  answer: string;
  featured: boolean;
  tags: string[];
}

export interface Pools {
  cases: PoolCase[];
  reviews: PoolReview[];
  aiOpinions: PoolAIOpinion[];
  courses: PoolCourse[];
  faqs: PoolFaq[];
}

const EMPTY: Pools = { cases: [], reviews: [], aiOpinions: [], courses: [], faqs: [] };

const PoolsContext = createContext<Pools>(EMPTY);

export const PoolsProvider = PoolsContext.Provider;
export const usePools = () => useContext(PoolsContext);

/** Fetches all pool tables in parallel. Used by PublicPage and Index. */
export function usePoolsQuery() {
  return useQuery({
    queryKey: ["pools"],
    queryFn: async (): Promise<Pools> => {
      const [cases, reviews, ai, courses, faqs] = await Promise.all([
        supabase.from("cases").select("*").order("position"),
        supabase.from("reviews").select("*").order("position"),
        supabase.from("ai_opinions").select("*").order("position"),
        supabase.from("courses").select("*").order("position"),
        supabase.from("faqs").select("*").order("position"),
      ]);
      return {
        cases: ((cases.data ?? []) as unknown as PoolCase[]),
        reviews: ((reviews.data ?? []) as unknown as PoolReview[]),
        aiOpinions: ((ai.data ?? []) as unknown as PoolAIOpinion[]),
        courses: ((courses.data ?? []) as unknown as PoolCourse[]),
        faqs: ((faqs.data ?? []) as unknown as PoolFaq[]),
      };
    },
    staleTime: 60_000,
  });
}