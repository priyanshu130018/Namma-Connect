import React, { useEffect } from "react";

export interface PageMetadataProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article" | "product";
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export const PageMetadata: React.FC<PageMetadataProps> = ({
  title,
  description = "Discover and book authentic local Karnataka experiences, stays, and guided cultural tours on NammaConnect.",
  canonical,
  image = "/og-image.jpg",
  type = "website",
  jsonLd,
}) => {
  const fullTitle = title.includes("NammaConnect") ? title : `${title} | NammaConnect`;

  useEffect(() => {
    // 1. Update document title
    document.title = fullTitle;

    // 2. Helper to set or create meta tags
    const setMetaTag = (attr: "name" | "property", key: string, value: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute("content", value);
    };

    setMetaTag("name", "description", description);
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:type", type);
    setMetaTag("property", "og:image", image);
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", image);

    // 3. Canonical URL
    const canonicalUrl = canonical || window.location.href.split("?")[0];
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", canonicalUrl);
    setMetaTag("property", "og:url", canonicalUrl);

    // 4. Structured Data (JSON-LD)
    let scriptJsonLd = document.getElementById("page-json-ld") as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptJsonLd) {
        scriptJsonLd = document.createElement("script");
        scriptJsonLd.id = "page-json-ld";
        scriptJsonLd.type = "application/ld+json";
        document.head.appendChild(scriptJsonLd);
      }
      scriptJsonLd.textContent = JSON.stringify(
        Array.isArray(jsonLd)
          ? { "@context": "https://schema.org", "@graph": jsonLd }
          : { "@context": "https://schema.org", ...jsonLd }
      );
    } else if (scriptJsonLd) {
      scriptJsonLd.remove();
    }
  }, [fullTitle, description, canonical, image, type, jsonLd]);

  return null;
};
