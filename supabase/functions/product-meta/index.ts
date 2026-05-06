// Edge function: serves Open Graph / Twitter Card meta tags AND fully crawlable
// HTML (with JSON-LD Product schema) for product links. Search-engine and AI
// crawlers (Googlebot, GPTBot, ClaudeBot, PerplexityBot, etc.) get a full HTML
// page they can index and cite. Real users get redirected to the SPA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_ORIGIN = "https://bigsales.ng";

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("id");

    if (!productId) {
      return Response.redirect(SITE_ORIGIN, 302);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: product, error } = await supabase
      .from("products")
      .select(
        "id, name, description, image_url, video_url, price, discount_price, in_stock, quantity",
      )
      .eq("id", productId)
      .maybeSingle();

    const productUrl = `${SITE_ORIGIN}/product/${productId}`;

    if (error || !product) {
      return Response.redirect(SITE_ORIGIN, 302);
    }

    // Fetch up to 5 reviews for aggregate rating + crawlable content
    const { data: reviews } = await supabase
      .from("reviews_public")
      .select("rating, comment, reviewer_name, created_at")
      .eq("product_id", productId)
      .limit(20);

    const ratingCount = reviews?.length ?? 0;
    const ratingAvg = ratingCount > 0
      ? (reviews!.reduce((s, r: any) => s + (r.rating || 0), 0) / ratingCount).toFixed(1)
      : null;

    const displayPrice = product.discount_price ?? product.price;
    const title = escapeHtml(product.name || "BIG SALES Product");
    const rawDesc = product.description?.trim() ||
      `${product.name} — only ₦${Number(displayPrice).toLocaleString()} on BIG SALES. Shop now with fast nationwide delivery across Nigeria.`;
    const description = escapeHtml(rawDesc);
    const image = product.image_url
      ? escapeHtml(product.image_url)
      : "https://storage.googleapis.com/gpt-engineer-file-uploads/SzyuKHeCsvOLqYpVYDT63Kyszti2/social-images/social-1764254953842-ChatGPT%20Image%20Nov%2027,%202025,%2002_47_20%20PM.png";
    const video = product.video_url ? escapeHtml(product.video_url) : null;
    const canonical = escapeHtml(productUrl);
    const redirectTarget = escapeHtml(productUrl);
    const inStock = product.in_stock !== false && (product.quantity ?? 0) > 0;
    const availability = inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

    const ua = req.headers.get("user-agent")?.toLowerCase() || "";
    // Expanded crawler list: social previewers + search engines + AI crawlers
    const isCrawler =
      /bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot|telegrambot|slackbot|linkedinbot|discordbot|preview|embed|skype|pinterest|googlebot|bingbot|applebot|ia_archiver|duckduckbot|yandexbot|baiduspider|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|perplexitybot|perplexity-user|google-extended|anthropic-ai|ccbot|bytespider|amazonbot|mistralai|cohere-ai|youbot|diffbot|semrushbot|ahrefsbot/
        .test(ua);

    // JSON-LD Product schema
    const productSchema: Record<string, unknown> = {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: product.name,
      image: [product.image_url].filter(Boolean),
      description: rawDesc,
      sku: product.id,
      brand: { "@type": "Brand", name: "BIG SALES" },
      offers: {
        "@type": "Offer",
        url: productUrl,
        priceCurrency: "NGN",
        price: String(displayPrice),
        availability,
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: "BIG SALES" },
      },
    };

    if (ratingCount > 0 && ratingAvg) {
      productSchema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: ratingAvg,
        reviewCount: ratingCount,
      };
    }

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
        { "@type": "ListItem", position: 2, name: "Products", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
      ],
    };

    const redirectScript = isCrawler
      ? ""
      : `<script>window.location.replace(${JSON.stringify(productUrl)});</script>
    <meta http-equiv="refresh" content="0;url=${redirectTarget}" />`;

    const videoTags = video
      ? `
    <meta property="og:video" content="${video}" />
    <meta property="og:video:secure_url" content="${video}" />
    <meta property="og:video:type" content="video/mp4" />
    <meta property="og:video:width" content="1280" />
    <meta property="og:video:height" content="720" />
    <meta name="twitter:player" content="${video}" />`
      : "";

    const reviewsHtml = (reviews ?? []).slice(0, 5).map((r: any) => `
        <article>
          <p><strong>${escapeHtml(r.reviewer_name || "Customer")}</strong> — ${r.rating}/5 stars</p>
          <p>${escapeHtml(r.comment || "")}</p>
        </article>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en-NG">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} – ₦${Number(displayPrice).toLocaleString()} | BIG SALES Nigeria</title>
    <link rel="canonical" href="${canonical}" />
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />

    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="BIG SALES" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="1200" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="product:price:amount" content="${displayPrice}" />
    <meta property="product:price:currency" content="NGN" />
    <meta property="product:availability" content="${inStock ? "in stock" : "out of stock"}" />
    ${videoTags}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:url" content="${canonical}" />

    <script type="application/ld+json">${JSON.stringify(productSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>

    ${redirectScript}
</head>
<body>
    <nav aria-label="Breadcrumb">
      <a href="${SITE_ORIGIN}/">Home</a> &rsaquo;
      <a href="${SITE_ORIGIN}/">Products</a> &rsaquo;
      <span>${title}</span>
    </nav>
    <main>
      <h1>${title}</h1>
      <p><img src="${image}" alt="${title}" width="600" /></p>
      <p><strong>Price: ₦${Number(displayPrice).toLocaleString()}</strong> ${product.discount_price ? `<s>₦${Number(product.price).toLocaleString()}</s>` : ""}</p>
      <p>Availability: ${inStock ? "In stock" : "Out of stock"}</p>
      <p>Brand: BIG SALES &middot; SKU: ${escapeHtml(product.id)}</p>
      <section>
        <h2>Description</h2>
        <p>${description}</p>
      </section>
      ${ratingCount > 0 ? `<section><h2>Customer Reviews</h2><p>Average rating: ${ratingAvg}/5 from ${ratingCount} reviews.</p>${reviewsHtml}</section>` : ""}
      <p><a href="${redirectTarget}">Buy ${title} on BIG SALES Nigeria</a></p>
      <p><a href="${SITE_ORIGIN}/">Browse all products</a></p>
    </main>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (e) {
    console.error("product-meta error", e);
    return Response.redirect(SITE_ORIGIN, 302);
  }
});
