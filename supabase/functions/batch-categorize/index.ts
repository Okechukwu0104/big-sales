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
    // Add JWT verification for security
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
        // Enhanced system prompt with better examples
        const systemPrompt = `You are a product categorization expert. Analyze product names and descriptions to assign them to the most appropriate category.

CATEGORY OPTIONS (choose ONLY one):
- Electronics (phones, laptops, headphones, cameras, gadgets)
- Fashion & Clothing (shoes, shirts, dresses, accessories, watches, jewelry)
- Home & Garden (furniture, decor, gardening tools, kitchenware)
- Sports & Outdoors (sports equipment, outdoor gear, fitness)
- Beauty & Personal Care (cosmetics, skincare, hair clippers, grooming)
- Books & Media (books, magazines, music, movies)
- Toys & Games (toys, video games, board games)
- Food & Beverages (food items, drinks, snacks)
- Health & Wellness (medicines, supplements, fitness trackers)
- Automotive (car parts, accessories, tools)
- Office Supplies (stationery, paper, pens, office equipment)
- Pet Supplies (pet food, toys, accessories)
- Jewelry & Accessories (watches, necklaces, rings, bracelets)
- Baby & Kids (baby clothes, toys, childcare products)
- Home Appliances (refrigerators, washing machines, blenders)
- Computers & Accessories (laptops, desktops, monitors, keyboards)
- Mobile Phones & Tablets (smartphones, tablets, accessories)
- Furniture (chairs, tables, beds, sofas)
- Tools & DIY (power tools, hand tools, building materials)

IMPORTANT RULES:
1. Return ONLY the exact category name from the list above
2. No explanations, no punctuation, just the single category name
3. Be specific - choose the most precise category
4. For electronics: use "Electronics" for general, "Computers & Accessories" for computers, "Mobile Phones & Tablets" for phones
5. For clothing items: use "Fashion & Clothing"
6. For beauty items: use "Beauty & Personal Care"
7. For home items: use "Home & Garden" or "Home Appliances" as appropriate

EXAMPLES:
- "Wireless headphones" → "Electronics"
- "Running shoes" → "Fashion & Clothing" 
- "iPhone 15" → "Mobile Phones & Tablets"
- "Gaming laptop" → "Computers & Accessories"
- "Hair clipper" → "Beauty & Personal Care"
- "Wrist watch" → "Jewelry & Accessories"
- "Sofa" → "Furniture"
- "Protein powder" → "Health & Wellness"`;

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
                content: `Categorize this product:\n\nPRODUCT NAME: ${product.name}\nDESCRIPTION: ${product.description || 'No description'}\n\nCATEGORY:`
              }
            ],
            temperature: 0.1,
            max_tokens: 20,
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
        
        // Enhanced cleaning and normalization
        category = category
          .replace(/^["'`]|["'`]$/g, '') // Remove quotes
          .replace(/\.$/, '') // Remove trailing period
          .split('\n')[0] // Take only first line
          .split('-')[0] // Take only before hyphen
          .trim();
        
        // Normalize common variations
        const categoryMap: { [key: string]: string } = {
          'fashion': 'Fashion & Clothing',
          'clothing': 'Fashion & Clothing',
          'apparel': 'Fashion & Clothing',
          'electronics': 'Electronics',
          'tech': 'Electronics',
          'technology': 'Electronics',
          'beauty': 'Beauty & Personal Care',
          'cosmetics': 'Beauty & Personal Care',
          'home': 'Home & Garden',
          'sports': 'Sports & Outdoors',
          'health': 'Health & Wellness',
          'wellness': 'Health & Wellness',
          'automotive': 'Automotive',
          'office': 'Office Supplies',
          'pet': 'Pet Supplies',
          'jewelry': 'Jewelry & Accessories',
          'accessories': 'Jewelry & Accessories',
          'baby': 'Baby & Kids',
          'kids': 'Baby & Kids',
          'children': 'Baby & Kids',
          'appliances': 'Home Appliances',
          'computers': 'Computers & Accessories',
          'computer': 'Computers & Accessories',
          'mobile': 'Mobile Phones & Tablets',
          'phones': 'Mobile Phones & Tablets',
          'phone': 'Mobile Phones & Tablets',
          'furniture': 'Furniture',
          'tools': 'Tools & DIY',
          'diy': 'Tools & DIY',
        };
        
        // Check for partial matches and normalize
        const normalizedCategory = categoryMap[category.toLowerCase()] || category;
        
        // Final validation with broader matching
        const validCategories = [
          'Electronics', 'Fashion & Clothing', 'Home & Garden', 'Sports & Outdoors',
          'Beauty & Personal Care', 'Books & Media', 'Toys & Games', 'Food & Beverages',
          'Health & Wellness', 'Automotive', 'Office Supplies', 'Pet Supplies',
          'Jewelry & Accessories', 'Baby & Kids', 'Home Appliances', 'Computers & Accessories',
          'Mobile Phones & Tablets', 'Furniture', 'Tools & DIY'
        ];
        
        // Check if category matches any valid category (case insensitive, partial match)
        const finalCategory = validCategories.find(valid => 
          normalizedCategory.toLowerCase().includes(valid.toLowerCase()) ||
          valid.toLowerCase().includes(normalizedCategory.toLowerCase())
        ) || "Uncategorized";
        
        console.log(`Final category for "${product.name}": "${finalCategory}"`);

        // Update the product with the new category
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

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
