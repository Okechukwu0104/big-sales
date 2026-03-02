import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "You are a product listing assistant for an African e-commerce store. Your job is to identify the PHYSICAL PRODUCT shown in the image and create an accurate e-commerce listing.\n\nCRITICAL RULES:\n- Focus ONLY on the actual physical product in the image. Identify what the item IS (e.g. air fryer, blender, handbag, shoes).\n- NEVER use filenames, watermarks, TikTok handles, Instagram handles, or any overlay text as the product name.\n- NEVER describe the image composition (e.g. 'Black and White Abstract Artwork'). Describe the PRODUCT.\n- If you see a brand name ON the product itself (e.g. 'Kenwood', 'Samsung', 'Nike'), include it in the product name.\n- Write product names like a real e-commerce store: '[Brand] [Product Type] [Key Feature/Size]'. Example: 'Kenwood Digital Air Fryer 5L', 'Glass Coffee Teapot with Infuser', 'Samsung 55-inch Smart TV'.\n- Write descriptions as a professional seller would, highlighting features visible in the image.\n- Always suggest prices in Nigerian Naira (₦).",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Look at this product image. Identify what the PHYSICAL PRODUCT is. Ignore any watermarks, logos, overlays, background text, or filenames — they are NOT the product name. The product name must describe what the item actually IS. Extract: product name (with brand if visible on the product), a compelling 2-3 sentence description, a reasonable price in Naira, and the best category.",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                    },
                  },
                ],
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "create_product",
                  description:
                    "Create a product listing from the analyzed image",
                  parameters: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "The actual product name based on what the physical item is. Include brand if visible on the product. NEVER use filenames, watermarks, or unrelated text. Example: 'Kenwood Digital Air Fryer 5L' not 'Black and White Abstract Artwork'",
                      },
                      description: {
                        type: "string",
                        description:
                          "A compelling product description highlighting key features visible in the image. Write as an e-commerce seller would. 2-3 sentences. Focus on material, size, functionality, and benefits.",
                      },
                      price: {
                        type: "number",
                        description:
                          "Suggested price in Nigerian Naira",
                      },
                      category: {
                        type: "string",
                        description:
                          "Product category (e.g. Electronics, Fashion, Home & Kitchen, Beauty, Sports, etc.)",
                      },
                    },
                    required: ["name", "description", "price", "category"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: {
              type: "function",
              function: { name: "create_product" },
            },
          }),
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const text = await response.text();
        console.error("AI gateway error:", status, text);
        throw new Error(`AI gateway returned ${status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall?.function?.arguments) {
        const product = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify(product), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback: try to parse from content
      throw new Error("No structured output from AI");
    } catch (err) {
      clearTimeout(timeout);

      if ((err as Error).name === "AbortError") {
        console.error("AI request timed out");
        return new Response(
          JSON.stringify({
            name: "New Product",
            description: "Product description pending",
            price: 5000,
            category: "Uncategorized",
            error: "AI timed out, using defaults",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("ai-generate-product error:", error);
    return new Response(
      JSON.stringify({
        name: "New Product",
        description: "Product description pending",
        price: 5000,
        category: "Uncategorized",
        error: (error as Error).message || "Failed to analyze image",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
