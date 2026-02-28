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
                  "You are a product listing assistant for an African e-commerce store. Analyze images and extract product information. Always suggest prices in Nigerian Naira (₦). Be concise and accurate.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyze this product image. Extract the product name, a compelling description (2-3 sentences), a reasonable price in Naira, and the most fitting category.",
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
                        description: "Product name, concise and descriptive",
                      },
                      description: {
                        type: "string",
                        description:
                          "Compelling product description, 2-3 sentences",
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

      if (err.name === "AbortError") {
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
        error: error.message || "Failed to analyze image",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
