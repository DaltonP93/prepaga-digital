import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

/**
 * Validate API key against database-stored keys
 * SECURITY: API keys should be stored in a secure table with hashing
 * This implementation validates against the company_settings table
 */
const validateApiKey = async (supabase: any, apiKey: string): Promise<{ valid: boolean; companyId?: string }> => {
  if (!apiKey || apiKey.length < 32) {
    return { valid: false };
  }

  // Check if API key exists in company settings
  // In production, you should hash the API key and compare hashes
  const { data, error } = await supabase
    .from('company_settings')
    .select('company_id, email_api_key')
    .eq('email_api_key', apiKey)
    .single();

  if (error || !data) {
    console.log('API key validation failed:', error?.message || 'Key not found');
    return { valid: false };
  }

  return { valid: true, companyId: data.company_id };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for API key validation
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate API Key from header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const validation = await validateApiKey(supabase, apiKey);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const companyId = validation.companyId;
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Route handling - pass companyId for scoped access
    if (path.startsWith("/api/clients")) {
      return handleClientsAPI(supabase, method, path, req, companyId);
    } else if (path.startsWith("/api/sales")) {
      return handleSalesAPI(supabase, method, path, req, companyId);
    } else if (path.startsWith("/api/documents")) {
      return handleDocumentsAPI(supabase, method, path, req, companyId);
    } else if (path.startsWith("/api/analytics")) {
      return handleAnalyticsAPI(supabase, method, path, req, companyId);
    } else {
      return new Response(JSON.stringify({ error: "Endpoint not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

// Clients API handlers - scoped to company
async function handleClientsAPI(supabase: any, method: string, path: string, req: Request, companyId?: string) {
  const pathParts = path.split("/");
  const clientId = pathParts[3];

  switch (method) {
    case "GET":
      if (clientId) {
        // Get specific client - scoped to company
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .eq("company_id", companyId)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        // Get all clients for company
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return new Response(JSON.stringify({ clients: data, total: data.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

    case "POST":
      const clientData = await req.json();
      // Enforce company_id from API key
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...clientData, company_id: companyId })
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    case "PUT":
      if (!clientId) {
        throw new Error("Client ID required for update");
      }
      const updateData = await req.json();
      // Only allow update of clients in same company
      const { data: updatedData, error: updateError } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", clientId)
        .eq("company_id", companyId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      return new Response(JSON.stringify(updatedData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    case "DELETE":
      if (!clientId) {
        throw new Error("Client ID required for delete");
      }
      // Only allow delete of clients in same company
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId)
        .eq("company_id", companyId);
      
      if (deleteError) throw deleteError;
      return new Response(JSON.stringify({ message: "Client deleted successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    default:
      throw new Error("Method not allowed");
  }
}

// Sales API handlers - scoped to company
async function handleSalesAPI(supabase: any, method: string, path: string, req: Request, companyId?: string) {
  const pathParts = path.split("/");
  const saleId = pathParts[3];

  switch (method) {
    case "GET":
      if (saleId) {
        const { data, error } = await supabase
          .from("sales")
          .select(`
            *,
            clients(*),
            plans(*),
            companies(*)
          `)
          .eq("id", saleId)
          .eq("company_id", companyId)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        const { data, error } = await supabase
          .from("sales")
          .select(`
            *,
            clients(*),
            plans(*),
            companies(*)
          `)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return new Response(JSON.stringify({ sales: data, total: data.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

    case "POST":
      const saleData = await req.json();
      // Enforce company_id from API key
      const { data, error } = await supabase
        .from("sales")
        .insert({ ...saleData, company_id: companyId })
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    default:
      throw new Error("Method not allowed for sales");
  }
}

// Documents API handlers - scoped to company via sales
async function handleDocumentsAPI(supabase: any, method: string, path: string, req: Request, companyId?: string) {
  switch (method) {
    case "GET":
      // Get documents for sales belonging to this company
      const { data: sales } = await supabase
        .from("sales")
        .select("id")
        .eq("company_id", companyId);
      
      const saleIds = sales?.map((s: any) => s.id) || [];
      
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .in("sale_id", saleIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return new Response(JSON.stringify({ documents: data, total: data?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    default:
      throw new Error("Method not allowed for documents");
  }
}

// Analytics API handlers - scoped to company
async function handleAnalyticsAPI(supabase: any, method: string, path: string, req: Request, companyId?: string) {
  if (method !== "GET") {
    throw new Error("Only GET method allowed for analytics");
  }

  // Get comprehensive analytics scoped to company
  const [
    { data: clients },
    { data: sales },
    { data: documents }
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("company_id", companyId),
    supabase.from("sales").select("*").eq("company_id", companyId),
    supabase.from("documents").select("*, sales!inner(company_id)").eq("sales.company_id", companyId)
  ]);

  const analytics = {
    totalClients: clients?.length || 0,
    totalSales: sales?.length || 0,
    totalDocuments: documents?.length || 0,
    totalRevenue: sales?.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0) || 0,
    salesByStatus: sales?.reduce((acc: any, sale: any) => {
      acc[sale.status] = (acc[sale.status] || 0) + 1;
      return acc;
    }, {}),
    recentSales: sales?.slice(0, 10) || []
  };

  return new Response(JSON.stringify(analytics), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
