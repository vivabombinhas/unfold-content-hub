 import { Helmet } from "react-helmet-async";
 
 interface SEOProps {
   title?: string;
   description?: string;
   slug?: string;
  urlPath?: string;
   image?: string;
  heroImage?: string;
   status?: "draft" | "published";
   previewMode?: boolean;
    isAdmin?: boolean;
    schemas?: any[];
    modificador?: string;
    modificadorTipo?: string;
    categoria?: string;
    procedimento?: string;
    cidade?: string;
 }
 
 export const SEO = ({
   title,
   description,
   slug,
   urlPath,
    image,
    heroImage,
   status = "published",
    previewMode = false,
    isAdmin = false,
    schemas = [],
    modificador,
    modificadorTipo,
    categoria,
    procedimento,
    cidade,
  }: SEOProps) => {
   const siteTitle = "Clínica de Estética Batel · Curitiba";
   const fullTitle = title ? `${title} · ${siteTitle}` : siteTitle;
   const siteUrl = "https://esteticabatel.com.br";
   
   // Rules for noindex: draft status, preview mode, or admin routes
   const shouldNoIndex = status !== "published" || previewMode || isAdmin;
   
  // Canonical URL: usa o url_path hierárquico quando disponível.
  const canonicalPath = urlPath ? `/${urlPath}/` : slug ? `/${slug}/` : "/";
  const canonicalUrl = !shouldNoIndex ? `${siteUrl}${canonicalPath}` : undefined;
 
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
         {heroImage && <link rel="preload" as="image" href={heroImage} fetchPriority="high" />}

          {/* JSON-LD Schemas */}
          {(() => {
            const allSchemas = [...schemas];
            
            // MedicalProcedure schema with dynamic modifier mapping
            const medicalSchema: any = {
              "@context": "https://schema.org",
              "@type": "MedicalProcedure",
              "name": title || siteTitle,
              "description": metaDescription,
              "procedureType": "NonInvasiveProcedure",
              "bodyLocation": "Corpo",
              "provider": {
                "@type": "MedicalOrganization",
                "name": siteTitle,
                "url": siteUrl,
                "logo": `${siteUrl}/logo.png`,
              },
            };

            if (modificador && modificadorTipo) {
              switch (modificadorTipo) {
                case 'indicacao': medicalSchema.indication = { "@type": "MedicalIndication", "name": modificador }; break;
                case 'publico': medicalSchema.audience = { "@type": "Audience", "audienceType": modificador }; break;
                case 'area-corporal': medicalSchema.bodyLocation = modificador; break;
                case 'objetivo': medicalSchema.outcome = modificador; break;
              }
            }
            allSchemas.push(medicalSchema);

            // BreadcrumbList with hierarchy
            const breadcrumbItems = [
              { "@type": "ListItem", "position": 1, "name": "Início", "item": siteUrl }
            ];

            if (categoria) {
              const catName = categoria.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
              breadcrumbItems.push({
                "@type": "ListItem",
                "position": breadcrumbItems.length + 1,
                "name": catName,
                "item": `${siteUrl}/${categoria}/`
              });
            }

            if (procedimento) {
              const procName = procedimento.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
              const procPath = categoria ? `${categoria}/${procedimento}` : procedimento;
              breadcrumbItems.push({
                "@type": "ListItem",
                "position": breadcrumbItems.length + 1,
                "name": procName,
                "item": `${siteUrl}/${procPath}/`
              });
            }

            breadcrumbItems.push({
              "@type": "ListItem",
              "position": breadcrumbItems.length + 1,
              "name": title || "Tratamento",
              "item": canonicalUrl || siteUrl
            });

            allSchemas.push({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": breadcrumbItems
            });

            return allSchemas.map((schema, idx) => (
              <script key={idx} type="application/ld+json">
                {JSON.stringify(schema)}
              </script>
            ));
          })()}
      </Helmet>
   );
 };