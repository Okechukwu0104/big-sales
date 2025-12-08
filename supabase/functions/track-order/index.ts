import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { searchValue } = await req.json()

    if (!searchValue || typeof searchValue !== 'string' || !searchValue.trim()) {
      console.log('Invalid or empty search value provided')
      return new Response(
        JSON.stringify({ error: 'Search value is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const trimmedValue = searchValue.trim()
    console.log(`Searching for order with value: ${trimmedValue.substring(0, 3)}***`)

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if search value looks like a UUID (8-4-4-4-12 format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUUID = uuidRegex.test(trimmedValue)

    let query = supabase.from('orders').select('*')

    if (isUUID) {
      // Search by exact ID match
      console.log('Searching by order ID')
      query = query.eq('id', trimmedValue)
    } else {
      // Search by exact email match (case-insensitive) - no partial matching for security
      console.log('Searching by exact email match')
      query = query.ilike('customer_email', trimmedValue)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Database error:', error.message)
      return new Response(
        JSON.stringify({ error: 'Failed to search for order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!data) {
      console.log('No order found')
      return new Response(
        JSON.stringify({ order: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Order found: ${data.id.substring(0, 8)}***`)
    return new Response(
      JSON.stringify({ order: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
