import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all products that need categorization (Uncategorized or null)
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, description, category')
      .or('category.is.null,category.eq.Uncategorized');

    if (fetchError) {
      console.error("Error fetching products:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${products?.length || 0} products to categorize`);

    const results = [];
    
    for (const product of products || []) {
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
                content: `Product Name: ${product.name}\nDescription: ${product.description || 'No description provided'}\n\nWhat category does this product belong to?`
              }
            ],
          }),
        });

        if (!response.ok) {
          console.error(`AI error for product ${product.id}:`, response.status);
          results.push({ id: product.id, success: false, error: `AI request failed: ${response.status}` });
          continue;
        }

        const data = await response.json();
        const category = data.choices?.[0]?.message?.content?.trim() || "Uncategorized";

        // Update the product with the new category
        const { error: updateError } = await supabase
          .from('products')
          .update({ category })
          .eq('id', product.id);

        if (updateError) {
          console.error(`Error updating product ${product.id}:`, updateError);
          results.push({ id: product.id, success: false, error: updateError.message });
        } else {
          console.log(`Successfully categorized product ${product.id} as: ${category}`);
          results.push({ id: product.id, success: true, category });
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
        results.push({ id: product.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({ 
      message: `Categorization complete: ${successCount} successful, ${failCount} failed`,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in batch-categorize function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
