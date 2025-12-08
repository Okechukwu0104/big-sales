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
        // Enhanced system prompt with better examples for your specific products
        const systemPrompt = `You are a product categorization expert. Analyze product names and descriptions to assign them to the most appropriate category.

CATEGORY OPTIONS (choose ONLY one):
- Fashion & Clothing (shoes, sneakers, loafers, boots, handbags, purses, watches, jewelry, accessories)
- Electronics (smartphones, phones, tablets, gadgets, electronics)
- Home Appliances (air fryers, washing machines, humidifiers, home appliances)
- Beauty & Personal Care (hair clippers, shavers, grooming tools, beauty products)
- Home & Garden (spray mops, toilet brushes, home cleaning supplies)
- Health & Wellness (health products, wellness items)
- Automotive (car accessories)
- Sports & Outdoors (sports equipment)
- Books & Media (books, media)
- Toys & Games (toys, games)
- Food & Beverages (food items)
- Office Supplies (office items)
- Pet Supplies (pet products)
- Baby & Kids (baby products)
- Tools & DIY (tools)

IMPORTANT RULES:
1. Return ONLY the exact category name from the list above
2. No explanations, no punctuation, just the single category name
3. Be specific - choose the most precise category

SPECIFIC GUIDELINES FOR COMMON PRODUCTS:
- Shoes, sneakers, loafers, boots → "Fashion & Clothing"
- Handbags, purses, totes → "Fashion & Clothing" 
- Watches, bracelets → "Fashion & Clothing"
- Smartphones, phones, tablets → "Electronics"
- Hair clippers, shavers → "Beauty & Personal Care"
- Air fryers, washing machines → "Home Appliances"
- Humidifiers → "Home Appliances"
- Cleaning supplies (mops, brushes) → "Home & Garden"

EXAMPLES:
- "Casual Shoe for Men" → "Fashion & Clothing"
- "Samsung Galaxy S10e" → "Electronics"
- "Rechargeable Hair Clipper" → "Beauty & Personal Care"
- "Tinmo Airfryer" → "Home Appliances"
- "Handbag" → "Fashion & Clothing"
- "Spray Mop" → "Home & Garden"`;

        // Clean the product description to remove repetitive text
        const cleanDescription = (product.description || '')
          .replace(/This is a complete barbering kit consisting of a professional clipper and eight \(8\) accessories\./g, '')
          .replace(/This set contains all the items you will need to have a nice, clean and comfortable hair whether in your home or in a barbershop\./g, '')
          .replace(/Thanks \. Welcome to Confam Best Stores\./g, '')
          .replace(/We offer best deals at affordable cost\./g, '')
          .replace(/You will get value for your money\./g, '')
          .replace(/Nothing beats the timeless appeal of our shoes, offering a distinct look that gets your attention\./g, '')
          .trim();

        const userContent = `Categorize this product:

PRODUCT NAME: ${product.name}
DESCRIPTION: ${cleanDescription || 'No description provided'}

CATEGORY:`;

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
                content: userContent
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
          .replace(/^Category:\s*/i, '') // Remove "Category:" prefix
          .split('\n')[0] // Take only first line
          .split('-')[0] // Take only before hyphen
          .trim();
        
        // Enhanced category mapping for your specific products
        const categoryMap: { [key: string]: string } = {
          // Fashion items
          'fashion': 'Fashion & Clothing',
          'clothing': 'Fashion & Clothing',
          'apparel': 'Fashion & Clothing',
          'shoes': 'Fashion & Clothing',
          'footwear': 'Fashion & Clothing',
          'sneakers': 'Fashion & Clothing',
          'loafers': 'Fashion & Clothing',
          'boots': 'Fashion & Clothing',
          'handbag': 'Fashion & Clothing',
          'purse': 'Fashion & Clothing',
          'tote': 'Fashion & Clothing',
          'bag': 'Fashion & Clothing',
          'watch': 'Fashion & Clothing',
          'wristwatch': 'Fashion & Clothing',
          'bracelet': 'Fashion & Clothing',
          'jewelry': 'Fashion & Clothing',
          'accessories': 'Fashion & Clothing',
          
          // Electronics
          'electronics': 'Electronics',
          'tech': 'Electronics',
          'technology': 'Electronics',
          'phone': 'Electronics',
          'smartphone': 'Electronics',
          'mobile': 'Electronics',
          'tablet': 'Electronics',
          'gadget': 'Electronics',
          
          // Home Appliances
          'appliances': 'Home Appliances',
          'appliance': 'Home Appliances',
          'air fryer': 'Home Appliances',
          'airfryer': 'Home Appliances',
          'washing machine': 'Home Appliances',
          'washer': 'Home Appliances',
          'humidifier': 'Home Appliances',
          
          // Beauty & Personal Care
          'beauty': 'Beauty & Personal Care',
          'personal care': 'Beauty & Personal Care',
          'grooming': 'Beauty & Personal Care',
          'clipper': 'Beauty & Personal Care',
          'shaver': 'Beauty & Personal Care',
          'trimmer': 'Beauty & Personal Care',
          'hair': 'Beauty & Personal Care',
          
          // Home & Garden
          'home': 'Home & Garden',
          'garden': 'Home & Garden',
          'cleaning': 'Home & Garden',
          'mop': 'Home & Garden',
          'brush': 'Home & Garden',
          'toilet': 'Home & Garden',
        };
        
        // Check for partial matches in the mapping
        let normalizedCategory = category;
        const lowerCategory = category.toLowerCase();
        
        for (const [key, value] of Object.entries(categoryMap)) {
          if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
            normalizedCategory = value;
            break;
          }
        }
        
        // Final validation with broader matching
        const validCategories = [
          'Fashion & Clothing', 'Electronics', 'Home Appliances', 
          'Beauty & Personal Care', 'Home & Garden', 'Health & Wellness',
          'Automotive', 'Sports & Outdoors', 'Books & Media', 'Toys & Games',
          'Food & Beverages', 'Office Supplies', 'Pet Supplies', 'Baby & Kids',
          'Tools & DIY'
        ];
        
        // Check if category matches any valid category
        const finalCategory = validCategories.find(valid => 
          normalizedCategory.toLowerCase() === valid.toLowerCase() ||
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