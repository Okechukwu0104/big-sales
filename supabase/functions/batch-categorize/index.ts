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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all products that need categorization
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, description, category')
      .or('category.is.null,category.eq.Uncategorized,category.eq.Unknown')
      .limit(50);

    if (fetchError) {
      console.error("Error fetching products:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${products?.length || 0} products to categorize`);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No products need categorization",
        results: [] 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    
    for (const product of products) {
      try {
        // Simple system prompt focused on title analysis
        const systemPrompt = `You are a product categorization expert. Analyze ONLY the product title to assign it to the most appropriate category.

CATEGORY OPTIONS (choose ONLY one):
- Fashion & Clothing (shoes, sneakers, loafers, boots, handbags, watches, jewelry, accessories, clothing)
- Electronics (phones, smartphones, tablets, gadgets, electronics, devices)
- Home Appliances (air fryers, washing machines, humidifiers, home appliances)
- Beauty & Personal Care (hair clippers, shavers, trimmers, grooming tools, beauty products)
- Home & Garden (mops, brushes, cleaning supplies, home items)
- Health & Wellness (health products, supplements)
- Sports & Outdoors (sports equipment, outdoor gear)
- Other (anything that doesn't fit above categories)

RULES:
1. Return ONLY the exact category name from the list above
2. No explanations, no punctuation, just the single category name
3. Base your decision SOLELY on the product title
4. Be specific but use only the provided categories

EXAMPLES:
- "Casual Shoe for Men" → "Fashion & Clothing"
- "Samsung Galaxy S10e" → "Electronics" 
- "Rechargeable Hair Clipper" → "Beauty & Personal Care"
- "Tinmo Airfryer" → "Home Appliances"
- "3Set Large Capacity Handbag" → "Fashion & Clothing"
- "Spray Mop" → "Home & Garden"
- "Top Luxury Mechanic Watch" → "Fashion & Clothing"`;

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
                content: systemPrompt
              },
              {
                role: "user",
                content: `Product Title: "${product.name}"\n\nCATEGORY:`
              }
            ],
            temperature: 0.1,
            max_tokens: 15,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI API error for product ${product.id}:`, response.status, errorText);
          results.push({ 
            id: product.id, 
            success: false, 
            error: `AI request failed: ${response.status}` 
          });
          continue;
        }

        const data = await response.json();
        let category = data.choices?.[0]?.message?.content?.trim() || "Uncategorized";
        
        console.log(`Raw AI response for "${product.name}": "${category}"`);
        
        // Simple cleaning
        category = category
          .replace(/^["'`]|["'`]$/g, '')
          .replace(/\.$/, '')
          .replace(/^Category:\s*/i, '')
          .split('\n')[0]
          .trim();

        // Simple category validation
        const validCategories = [
          'Fashion & Clothing', 'Electronics', 'Home Appliances', 
          'Beauty & Personal Care', 'Home & Garden', 'Health & Wellness',
          'Sports & Outdoors', 'Other'
        ];
        
        const finalCategory = validCategories.find(valid => 
          category.toLowerCase() === valid.toLowerCase()
        ) || "Uncategorized";
        
        console.log(`Final category for "${product.name}": "${finalCategory}"`);

        // Update the product
        const { error: updateError } = await supabase
          .from('products')
          .update({ category: finalCategory, updated_at: new Date().toISOString() })
          .eq('id', product.id);

        if (updateError) {
          console.error(`Error updating product ${product.id}:`, updateError);
          results.push({ 
            id: product.id, 
            success: false, 
            error: updateError.message 
          });
        } else {
          console.log(`Successfully categorized product ${product.id}: "${product.name}" -> "${finalCategory}"`);
          results.push({ 
            id: product.id, 
            success: true, 
            category: finalCategory,
            previous_category: product.category 
          });
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
        results.push({ 
          id: product.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({ 
      message: `Categorization complete: ${successCount} successful, ${failCount} failed`,
      total_processed: products.length,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Error in batch-categorize function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});