import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

// Helper function to validate API key
const validateApiKey = async (apiKey: string) => {
  // In production, store API keys in a secure table
  const validApiKeys = ["api_key_123", "api_key_456"]; // Demo keys
  return validApiKeys.includes(apiKey);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API Key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || !(await validateApiKey(apiKey))) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Route handling
    if (path.startsWith("/api/clients")) {
      return handleClientsAPI(supabase, method, path, req);
    } else if (path.startsWith("/api/sales")) {
      return handleSalesAPI(supabase, method, path, req);
    } else if (path.startsWith("/api/documents")) {
      return handleDocumentsAPI(supabase, method, path, req);
    } else if (path.startsWith("/api/analytics")) {
      return handleAnalyticsAPI(supabase, method, path, req);
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

// Clients API handlers
async function handleClientsAPI(supabase: any, method: string, path: string, req: Request) {
  const pathParts = path.split("/");
  const clientId = pathParts[3];

  switch (method) {
    case "GET":
      if (clientId) {
        // Get specific client
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        // Get all clients
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return new Response(JSON.stringify({ clients: data, total: data.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

    case "POST":
      const clientData = await req.json();
      const { data, error } = await supabase
        .from("clients")
        .insert(clientData)
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
      const { data: updatedData, error: updateError } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", clientId)
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
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);
      
      if (deleteError) throw deleteError;
      return new Response(JSON.stringify({ message: "Client deleted successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    default:
      throw new Error("Method not allowed");
  }
}

// Sales API handlers
async function handleSalesAPI(supabase: any, method: string, path: string, req: Request) {
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
            companies(*),
            profiles(*)
          `)
          .eq("id", saleId)
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
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return new Response(JSON.stringify({ sales: data, total: data.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

    case "POST":
      const saleData = await req.json();
      const { data, error } = await supabase
        .from("sales")
        .insert(saleData)
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

// Documents API handlers
async function handleDocumentsAPI(supabase: any, method: string, path: string, req: Request) {
  switch (method) {
    case "GET":
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return new Response(JSON.stringify({ documents: data, total: data.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    default:
      throw new Error("Method not allowed for documents");
  }
}

// Analytics API handlers
async function handleAnalyticsAPI(supabase: any, method: string, path: string, req: Request) {
  if (method !== "GET") {
    throw new Error("Only GET method allowed for analytics");
  }

  // Get comprehensive analytics
  const [
    { data: clients },
    { data: sales },
    { data: documents },
    { data: companies }
  ] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("sales").select("*"),
    supabase.from("documents").select("*"),
    supabase.from("companies").select("*")
  ]);

  const analytics = {
    totalClients: clients?.length || 0,
    totalSales: sales?.length || 0,
    totalDocuments: documents?.length || 0,
    totalCompanies: companies?.length || 0,
    totalRevenue: sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
    salesByStatus: sales?.reduce((acc, sale) => {
      acc[sale.status] = (acc[sale.status] || 0) + 1;
      return acc;
    }, {}),
    recentSales: sales?.slice(0, 10) || []
  };

  return new Response(JSON.stringify(analytics), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}