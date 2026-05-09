 import { Helmet } from "react-helmet-async";
 
 interface SEOProps {
   title?: string;
   description?: string;
   slug?: string;
   image?: string;
  heroImage?: string;
   status?: "draft" | "published";
   previewMode?: boolean;
   isAdmin?: boolean;
 }
 
 export const SEO = ({
   title,
   description,
   slug,
    image,
    heroImage,
   status = "published",
   previewMode = false,
   isAdmin = false,
 }: SEOProps) => {
   const siteTitle = "Clínica de Estética Batel · Curitiba";
   const fullTitle = title ? `${title} · ${siteTitle}` : siteTitle;
   const siteUrl = "https://esteticabatel.com.br";
   
   // Rules for noindex: draft status, preview mode, or admin routes
   const shouldNoIndex = status !== "published" || previewMode || isAdmin;
   
   // Canonical URL: only for published pages, and should not include /p/
   // If no slug is provided and it's not noindex, it's the home page.
   const canonicalUrl = !shouldNoIndex ? (slug ? `${siteUrl}/${slug}/` : `${siteUrl}/`) : undefined;
 
   const defaultDescription = "Protocolos exclusivos de estética avançada na Clínica Batel, Curitiba — excelência desde 1995.";
   const metaDescription = description || defaultDescription;
 
   return (
     <Helmet>
       {/* Standard metadata tags */}
       <title>{fullTitle}</title>
       <meta name="description" content={metaDescription} />
       {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
 
       {/* Indexation rules */}
       {shouldNoIndex ? (
         <meta name="robots" content="noindex, nofollow" />
       ) : (
         <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
       )}
 
       {/* Open Graph / Facebook */}
       <meta property="og:type" content="website" />
       <meta property="og:url" content={canonicalUrl || siteUrl} />
       <meta property="og:title" content={fullTitle} />
       <meta property="og:description" content={metaDescription} />
       {image && <meta property="og:image" content={image} />}
       <meta property="og:locale" content="pt_BR" />
       <meta property="og:site_name" content="Clínica de Estética Batel" />
 
       {/* Twitter */}
       <meta name="twitter:card" content="summary_large_image" />
       <meta name="twitter:url" content={canonicalUrl || siteUrl} />
       <meta name="twitter:title" content={fullTitle} />
       <meta name="twitter:description" content={metaDescription} />
        {image && <meta name="twitter:image" content={image} />}

        {/* Performance: Preload hero image if available */}
        {heroImage && (
          <link
            rel="preload"
            as="image"
            href={heroImage}
            {...{ fetchPriority: "high" }}
          />
        )}
     </Helmet>
   );
 };