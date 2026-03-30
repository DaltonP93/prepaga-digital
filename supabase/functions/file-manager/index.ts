import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FileUploadData {
  filename: string;
  bucketName: string;
  filePath?: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) {
      throw new Error("Invalid authentication token");
    }

    const url = new URL(req.url);
    const contentType = req.headers.get("content-type") || "";
    let requestPayload: Record<string, unknown> | null = null;
    if (contentType.includes("application/json")) {
      try {
        requestPayload = await req.clone().json();
      } catch {
        requestPayload = null;
      }
    }
    const action =
      url.searchParams.get("action") ||
      (typeof requestPayload?.action === "string" ? requestPayload.action : null) ||
      (contentType.includes("multipart/form-data") ? "upload" : null);

    switch (action) {
      case "upload":
        return await handleFileUpload(supabase, req, userData.user.id);
      case "list":
        return await handleFileList(supabase, req, userData.user.id);
      case "delete":
        return await handleFileDelete(supabase, req, userData.user.id, requestPayload);
      case "get-url":
        return await handleGetSignedUrl(supabase, req, userData.user.id, requestPayload);
      default:
        throw new Error("Invalid action parameter");
    }

  } catch (error: any) {
    console.error("File manager error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

async function handleFileUpload(supabase: any, req: Request, userId: string) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const bucketName = formData.get("bucketName") as string || "documents";
  const isPublic = formData.get("isPublic") === "true";
  const requestedFilePath = formData.get("filePath") as string | null;
  const companyId = (formData.get("companyId") as string | null) || null;
  const entityType = (formData.get("entityType") as string | null) || null;
  const entityId = (formData.get("entityId") as string | null) || null;
  
  if (!file) {
    throw new Error("No file provided");
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File size exceeds 10MB limit");
  }

  // Validate file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("File type not allowed");
  }

  // Create unique file path
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const generatedFileName = `${userId}/${timestamp}-${crypto.randomUUID()}.${extension}`;
  const fileName = requestedFilePath?.trim() || generatedFileName;
  
  // Convert file to array buffer
  const fileBuffer = await file.arrayBuffer();

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Store file metadata in database (best-effort)
  const { data: fileRecord, error: dbError } = await supabase
    .from("file_uploads")
    .insert({
      uploaded_by: userId,
      company_id: companyId,
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      file_url: fileName,
    })
    .select()
    .single();

  if (dbError) {
  }

  // Get public URL if file is public
  let publicUrl = null;
  if (isPublic) {
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    publicUrl = urlData.publicUrl;
  }

  return new Response(JSON.stringify({
    success: true,
    file: {
      id: fileRecord?.id ?? null,
      name: file.name,
      path: fileName,
      size: file.size,
      type: file.type,
      url: publicUrl,
      created_at: fileRecord?.created_at ?? new Date().toISOString()
    }
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function handleFileList(supabase: any, req: Request, userId: string) {
  const url = new URL(req.url);
  const bucketName = url.searchParams.get("bucket") || "documents";
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const { data: files, error } = await supabase
    .from("file_uploads")
    .select("*")
    .eq("user_id", userId)
    .eq("bucket_name", bucketName)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch files: ${error.message}`);
  }

  // Get signed URLs for each file
  const filesWithUrls = await Promise.all(
    files.map(async (file: any) => {
      const { data: urlData, error: urlError } = await supabase.storage
        .from(file.bucket_name)
        .createSignedUrl(file.file_path, 3600); // 1 hour expiry

      return {
        ...file,
        signed_url: urlError ? null : urlData.signedUrl
      };
    })
  );

  return new Response(JSON.stringify({
    files: filesWithUrls,
    total: files.length,
    limit,
    offset
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function handleFileDelete(
  supabase: any,
  req: Request,
  userId: string,
  payload?: Record<string, unknown> | null
) {
  const body = payload ?? await req.json();
  const fileId = typeof body?.fileId === "string" ? body.fileId : null;
  const bucketName = typeof body?.bucketName === "string" ? body.bucketName : null;
  const filePath = typeof body?.filePath === "string" ? body.filePath : null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.company_id) {
    throw new Error("User company not found");
  }

  let resolvedBucket: string;
  let resolvedPath: string;

  if (fileId) {
    const { data: fileInfo, error: fetchError } = await supabase
      .from("file_uploads")
      .select("id, company_id, file_url")
      .eq("id", fileId)
      .single();

    if (fetchError || !fileInfo) {
      throw new Error("File not found");
    }

    if (fileInfo.company_id && fileInfo.company_id !== profile.company_id) {
      throw new Error("Access denied");
    }

    resolvedBucket = bucketName || "documents";
    resolvedPath = fileInfo.file_url;
  } else if (bucketName && filePath) {
    const companyPrefix = `${profile.company_id}/`;
    if (!filePath.startsWith(companyPrefix)) {
      throw new Error("Access denied");
    }

    resolvedBucket = bucketName;
    resolvedPath = filePath;
  } else {
    throw new Error("fileId or (bucketName + filePath) required");
  }

  const { error: storageError } = await supabase.storage
    .from(resolvedBucket)
    .remove([resolvedPath]);

  if (storageError) {
    throw new Error(`Storage deletion failed: ${storageError.message}`);
  }

  const deleteQuery = supabase.from("file_uploads").delete().eq("file_url", resolvedPath);
  if (fileId) {
    await deleteQuery.eq("id", fileId);
  } else {
    await deleteQuery.eq("company_id", profile.company_id);
  }

  return new Response(JSON.stringify({
    success: true,
    message: "File deleted successfully"
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function handleGetSignedUrl(
  supabase: any,
  req: Request,
  userId: string,
  payload?: Record<string, unknown> | null
) {
  const body = payload ?? await req.json();
  const filePath = typeof body?.filePath === "string" ? body.filePath : null;
  const bucketName = typeof body?.bucketName === "string" ? body.bucketName : null;
  const fileId = typeof body?.fileId === "string" ? body.fileId : null;
  const expiresIn = typeof body?.expiresIn === "number" ? body.expiresIn : 3600;

  let resolvedPath: string;
  let resolvedBucket: string;

  if (fileId) {
    // Preferred: look up by fileId with ownership check
    const { data: fileRecord, error: fileErr } = await supabase
      .from('file_uploads')
      .select('file_url, company_id')
      .eq('id', fileId)
      .single();

    if (fileErr || !fileRecord) {
      throw new Error("File not found or access denied");
    }

    // Verify the user belongs to the same company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (!profile?.company_id || profile.company_id !== fileRecord.company_id) {
      throw new Error("Access denied: file does not belong to your company");
    }

    resolvedBucket = bucketName || 'documents';
    resolvedPath = fileRecord.file_url;
  } else if (filePath && bucketName) {
    // Fallback: validate path ownership via file_uploads table
    const { data: fileRecord, error: fileErr } = await supabase
      .from('file_uploads')
      .select('id, company_id')
      .eq('file_url', filePath)
      .single();

    if (fileErr || !fileRecord) {
      throw new Error("File not found or access denied");
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (!profile?.company_id || profile.company_id !== fileRecord.company_id) {
      throw new Error("Access denied: file does not belong to your company");
    }

    resolvedBucket = bucketName;
    resolvedPath = filePath;
  } else {
    throw new Error("fileId or (filePath + bucketName) required");
  }

  const { data, error } = await supabase.storage
    .from(resolvedBucket)
    .createSignedUrl(resolvedPath, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return new Response(JSON.stringify({
    signed_url: data.signedUrl,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
