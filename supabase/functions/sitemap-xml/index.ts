// Dynamic sitemap.xml — lists every active product so search engines and AI
// crawlers can discover and index the full catalog.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_ORIGIN = "https://bigsales.ng";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: products } = await supabase
      .from("products")
      .select("id, name, image_url, updated_at, in_stock")
      .order("updated_at", { ascending: false })
      .limit(5000);

    const now = new Date().toISOString();

    const staticUrls = [
      { loc: `${SITE_ORIGIN}/`, priority: "1.0", changefreq: "daily", lastmod: now },
      { loc: `${SITE_ORIGIN}/track-order`, priority: "0.5", changefreq: "monthly", lastmod: now },
      { loc: `${SITE_ORIGIN}/cart`, priority: "0.4", changefreq: "monthly", lastmod: now },
    ];

    const urls = staticUrls.map((u) => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("");

    const productUrls = (products ?? []).map((p) => {
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString() : now;
      const image = p.image_url
        ? `
    <image:image>
      <image:loc>${escapeXml(p.image_url)}</image:loc>
      <image:title>${escapeXml(p.name || "")}</image:title>
    </image:image>`
        : "";
      return `
  <url>
    <loc>${SITE_ORIGIN}/product/${p.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${image}
  </url>`;
    }).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}${productUrls}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=600, s-maxage=3600",
      },
    });
  } catch (e) {
    console.error("sitemap-xml error", e);
    return new Response("<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"/>", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
    });
  }
});
