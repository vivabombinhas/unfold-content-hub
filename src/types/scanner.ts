export type UsagePolicy = "preserve_literal" | "inspiration_only";
export type SourceOrigin = "batel_legacy" | "external_reference" | "manual_paste";
export type SectionImageType = "hero" | "section" | "gallery" | "before_after" | "unknown";
export type SectionImagePosition = "above" | "below" | "inside" | "near_section";

export interface SectionImage {
  url: string;
  alt: string;
  position: SectionImagePosition;
  candidate_use: SectionImageType;
}

export interface ExtractedSection {
  id: string;
  raw_title: string;
  raw_content: string;
  suggested_type: string;
  confidence: number;
  usage_policy: UsagePolicy;
  source_origin: SourceOrigin;
  images: SectionImage[];
  extracted_data: any;
  raw_html_snippet?: string;
  selected?: boolean;
}

export interface ScannedPage {
  page_metadata: {
    detected_title: string;
    source_url: string;
    source_origin: SourceOrigin;
    default_usage_policy: UsagePolicy;
    scanned_at: string;
  };
  noise_removed: string[];
  sections: ExtractedSection[];
}
