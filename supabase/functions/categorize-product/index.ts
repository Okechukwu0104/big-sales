import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout for AI API call (10 seconds)
const AI_TIMEOUT_MS = 10000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, productDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a product categorization expert. Analyze product names and descriptions to assign them to appropriate categories. Choose from common e-commerce categories like: Electronics, Fashion, Home & Garden, Sports & Outdoors, Beauty & Personal Care, Books & Media, Toys & Games, Food & Beverages, Health & Wellness, Automotive, Office Supplies, Pet Supplies, Jewelry & Accessories, Baby & Kids, or suggest a new relevant category if none fit. Return ONLY the category name, nothing else."
            },
            {
              role: "user",
              content: `Product Name: ${productName}\nDescription: ${productDescription || 'No description provided'}\n\nWhat category does this product belong to?`
            }
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "AI gateway error", category: "Uncategorized" }), {
          status: 200, // Return 200 with fallback category so product creation succeeds
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const category = data.choices?.[0]?.message?.content?.trim() || "Uncategorized";

      console.log(`Categorized product "${productName}" as: ${category}`);

      return new Response(JSON.stringify({ category }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle timeout/abort specifically
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log(`AI categorization timed out for product "${productName}", using default category`);
        return new Response(JSON.stringify({ 
          category: "Uncategorized",
          message: "AI categorization timed out, using default category"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error("Error in categorize-product function:", error);
    // Return Uncategorized instead of error to not block product creation
    return new Response(JSON.stringify({ 
      category: "Uncategorized",
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 200, // Return 200 so the calling code gets a valid response
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
