// Edge function: serves Open Graph / Twitter Card meta tags for product links.
// Social media crawlers (WhatsApp, Facebook, Twitter, iMessage) hit this URL
// and read the meta tags to render rich link previews. Real users get redirected
// to the SPA product page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_ORIGIN = "https://big-sales.lovable.app";

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
        "id, name, description, image_url, video_url, price, discount_price",
      )
      .eq("id", productId)
      .maybeSingle();

    const productUrl = `${SITE_ORIGIN}/product/${productId}`;
    const shareUrl = url.toString();

    if (error || !product) {
      return Response.redirect(productUrl, 302);
    }

    const displayPrice = product.discount_price ?? product.price;
    const title = escapeHtml(product.name || "BIG SALES Product");
    const description = escapeHtml(
      product.description?.trim() ||
        `${product.name} — only ₦${Number(displayPrice).toLocaleString()} on BIG SALES. Shop now with fast nationwide delivery!`,
    );
    const image = product.image_url
      ? escapeHtml(product.image_url)
      : "https://storage.googleapis.com/gpt-engineer-file-uploads/SzyuKHeCsvOLqYpVYDT63Kyszti2/social-images/social-1764254953842-ChatGPT%20Image%20Nov%2027,%202025,%2002_47_20%20PM.png";
    const video = product.video_url ? escapeHtml(product.video_url) : null;
    const canonical = escapeHtml(shareUrl);
    const redirectTarget = escapeHtml(productUrl);

    // Detect social media crawlers — they get pure HTML, no redirect.
    // Real browsers get an instant JS redirect to the SPA.
    const ua = req.headers.get("user-agent")?.toLowerCase() || "";
    const isCrawler =
      /bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot|telegrambot|slackbot|linkedinbot|discordbot|preview|embed|skype|pinterest|googlebot|bingbot|applebot|ia_archiver/.test(
        ua,
      );

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

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} | BIG SALES</title>
    <link rel="canonical" href="${canonical}" />
    <meta name="description" content="${description}" />

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
    ${videoTags}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:url" content="${canonical}" />

    ${redirectScript}
</head>
<body>
    <p>Redirecting to <a href="${redirectTarget}">${title}</a>…</p>
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
