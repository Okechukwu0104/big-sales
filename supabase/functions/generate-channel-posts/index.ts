import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SITE = "https://big-sales.lovable.app";

type PostType = "promo" | "product" | "engagement";

function lagosToday(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
  return d.toISOString().slice(0, 10);
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

async function aiCaption(type: PostType, products: any[]): Promise<string> {
  const productCtx = products.map((p) => ({
    name: p.name,
    price: p.discount_price ?? p.price,
    original_price: p.original_price ?? p.price,
    description: (p.description || "").slice(0, 240),
    link: `${SITE}/product/${p.id}`,
  }));

  const briefs: Record<PostType, string> = {
    promo:
      "Write a punchy WhatsApp Channel PROMO post for a Nigerian shop. Urgency words, ₦ pricing, max 2 emojis per line, end with the product link. Highlight discount vs original price if any. 280-500 chars. Do NOT mention 'Pay on Delivery'.",
    product:
      "Write a WhatsApp Channel PRODUCT SHOWCASE post for a Nigerian shop. Bold product name, 2-3 benefit bullets with emojis, ₦ price line, end with the product link. 280-500 chars. Nigerian English tone. Do NOT mention 'Pay on Delivery'.",
    engagement:
      "Write a WhatsApp Channel ENGAGEMENT post (poll / 'this or that' / lifestyle question) using the products as context. NO hard sell. Ask the audience to react. 200-400 chars. End with the shop link " + SITE + ". Do NOT mention 'Pay on Delivery'.",
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a Nigerian e-commerce social media copywriter for BIG SALES. Output ONLY the caption text, no preamble, no quotes." },
        { role: "user", content: `${briefs[type]}\n\nPRODUCTS:\n${JSON.stringify(productCtx, null, 2)}` },
      ],
    }),
  });

  if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;

    const { data: settings } = await supabase.from("channel_ai_settings").select("*").limit(1).maybeSingle();
    if (!settings?.enabled && !force) {
      return new Response(JSON.stringify({ skipped: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = lagosToday();

    // Skip if already generated today (unless force)
    if (!force) {
      const { count } = await supabase
        .from("channel_posts")
        .select("id", { count: "exact", head: true })
        .eq("generated_for_date", today);
      if ((count || 0) >= 3) {
        return new Response(JSON.stringify({ skipped: "already_generated", date: today }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Exclude products used in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: recent } = await supabase
      .from("channel_posts")
      .select("product_id")
      .gte("created_at", sevenDaysAgo)
      .not("product_id", "is", null);
    const excludeIds = new Set((recent || []).map((r: any) => r.product_id));

    const { data: allProducts } = await supabase
      .from("products")
      .select("id,name,description,price,discount_price,original_price,image_url,featured,quantity,likes_count")
      .gt("quantity", 0)
      .limit(200);

    const pool = (allProducts || []).filter((p: any) => !excludeIds.has(p.id));
    if (pool.length === 0) {
      return new Response(JSON.stringify({ error: "No fresh products available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const discounted = pool.filter((p: any) => p.discount_price && p.discount_price < (p.original_price ?? p.price));
    const featured = pool.filter((p: any) => p.featured).sort((a: any, b: any) => (b.likes_count || 0) - (a.likes_count || 0));

    const promoProduct = pickRandom(discounted.length ? discounted : pool, 1)[0];
    const showcase = pickRandom(featured.length ? featured : pool, 1)[0];
    const engagementPicks = pickRandom(pool, 2);

    const buckets: { type: PostType; products: any[] }[] = [
      { type: "promo", products: [promoProduct] },
      { type: "product", products: [showcase] },
      { type: "engagement", products: engagementPicks },
    ];

    // Clear today's existing rows if forcing regenerate
    if (force) {
      await supabase.from("channel_posts").delete().eq("generated_for_date", today);
    }

    const inserted: any[] = [];
    for (const b of buckets) {
      const caption = await aiCaption(b.type, b.products);
      const main = b.products[0];
      const row = {
        post_type: b.type,
        caption,
        image_url: main?.image_url || null,
        product_id: b.type === "engagement" ? null : main?.id || null,
        product_link: b.type === "engagement" ? null : main ? `${SITE}/product/${main.id}` : null,
        generated_for_date: today,
      };
      const { data, error } = await supabase.from("channel_posts").insert(row).select().single();
      if (error) throw error;
      inserted.push(data);
    }

    return new Response(JSON.stringify({ ok: true, date: today, posts: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-channel-posts error:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
