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
    const { imageBase64, imageUrl, mimeType, nameHint } = await req.json();

    let finalBase64 = imageBase64;
    let finalMimeType = mimeType || "image/jpeg";

    // Support imageUrl: fetch and convert to base64
    if (!finalBase64 && imageUrl) {
      try {
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) throw new Error(`Failed to fetch image: ${imgResponse.status}`);
        finalMimeType = imgResponse.headers.get("content-type") || "image/jpeg";
        const arrayBuffer = await imgResponse.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        finalBase64 = btoa(binary);
      } catch (fetchErr) {
        console.error("Failed to fetch imageUrl:", fetchErr);
        return new Response(
          JSON.stringify({ error: "Failed to fetch image from URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!finalBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 or imageUrl is required" }),
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
                  "You are a product listing assistant for an African e-commerce store. Your job is to identify the PHYSICAL PRODUCT shown in the image and create an accurate e-commerce listing.\n\nCRITICAL RULES:\n- Focus ONLY on the actual physical product in the image. Identify what the item IS (e.g. air fryer, blender, handbag, shoes).\n- NEVER use filenames, watermarks, TikTok handles, Instagram handles, or any overlay text as the product name.\n- NEVER describe the image composition (e.g. 'Black and White Abstract Artwork'). Describe the PRODUCT.\n- If you see a brand name ON the product itself (e.g. 'Kenwood', 'Samsung', 'Nike'), include it in the product name.\n- Write product names like a real e-commerce store: '[Brand] [Product Type] [Key Feature/Size]'. Example: 'Kenwood Digital Air Fryer 5L', 'Glass Coffee Teapot with Infuser', 'Samsung 55-inch Smart TV'.\n- Write DETAILED, ELABORATE descriptions of AT LEAST 60 WORDS (4-5 rich sentences). You MUST cover ALL of the following in every description:\n  1) What the product is and its primary function\n  2) Key features, specifications, and capacity/size details\n  3) Material quality, build quality, and finish\n  4) Who it's ideal for and specific use cases\n  5) A compelling reason why the buyer should purchase it\n- EXAMPLE of a good description: 'The Kenwood Digital Air Fryer 5L is a versatile kitchen appliance that lets you enjoy crispy, delicious fried foods with up to 80% less oil. Featuring a large 5-litre capacity, digital touch controls, and adjustable temperature up to 200°C, it handles everything from fries to chicken wings with ease. The non-stick basket is dishwasher-safe and the sleek matte black exterior fits any modern kitchen. Perfect for health-conscious families and busy professionals who want quick, guilt-free meals. With its rapid air circulation technology, you get restaurant-quality results right at home.'\n- NEVER write descriptions shorter than 60 words. NEVER just repeat the product name. NEVER include pricing in the description.\n- Always suggest prices in Nigerian Naira (₦)." + (nameHint ? `\n\nHINT: The product is likely called "${nameHint}". Use this as context but verify against what you see in the image.` : ""),
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Look at this product image. Identify what the PHYSICAL PRODUCT is. Ignore any watermarks, logos, overlays, background text, or filenames — they are NOT the product name. The product name must describe what the item actually IS. Extract: product name (with brand if visible on the product), a DETAILED ELABORATE product description of AT LEAST 60 words covering what it is, features, specs, materials, use cases, and why to buy it. Also suggest a reasonable price in Naira and the best category. The description MUST be rich and professional — never short or generic.",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${finalMimeType};base64,${finalBase64}`,
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
                          "MINIMUM 60 words. A detailed, elaborate product description of 4-5 rich sentences. MUST cover ALL of: 1) What the product is and its primary function 2) Key features, specifications, capacity/size 3) Material and build quality 4) Who it's for and specific use cases 5) A compelling reason to buy. Write as a professional e-commerce seller. NEVER write fewer than 60 words. NEVER just repeat the product name. NEVER include pricing text.",
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
