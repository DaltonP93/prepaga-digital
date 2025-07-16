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
    const action = url.searchParams.get("action");

    switch (action) {
      case "upload":
        return await handleFileUpload(supabase, req, userData.user.id);
      case "list":
        return await handleFileList(supabase, req, userData.user.id);
      case "delete":
        return await handleFileDelete(supabase, req);
      case "get-url":
        return await handleGetSignedUrl(supabase, req);
      default:
        throw new Error("Invalid action parameter");
    }

  } catch (error) {
    console.error("File manager error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
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
  const fileName = `${userId}/${timestamp}-${crypto.randomUUID()}.${extension}`;
  
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

  // Store file metadata in database
  const { data: fileRecord, error: dbError } = await supabase
    .from("file_uploads")
    .insert({
      user_id: userId,
      bucket_name: bucketName,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      mime_type: file.type,
      upload_status: "completed"
    })
    .select()
    .single();

  if (dbError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from(bucketName).remove([fileName]);
    throw new Error(`Database error: ${dbError.message}`);
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
      id: fileRecord.id,
      name: file.name,
      path: fileName,
      size: file.size,
      type: file.type,
      url: publicUrl,
      created_at: fileRecord.created_at
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
    files.map(async (file) => {
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

async function handleFileDelete(supabase: any, req: Request) {
  const { fileId } = await req.json();
  
  if (!fileId) {
    throw new Error("File ID required");
  }

  // Get file info from database
  const { data: fileInfo, error: fetchError } = await supabase
    .from("file_uploads")
    .select("*")
    .eq("id", fileId)
    .single();

  if (fetchError || !fileInfo) {
    throw new Error("File not found");
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(fileInfo.bucket_name)
    .remove([fileInfo.file_path]);

  if (storageError) {
    console.error("Storage deletion error:", storageError);
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from("file_uploads")
    .delete()
    .eq("id", fileId);

  if (dbError) {
    throw new Error(`Database deletion failed: ${dbError.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    message: "File deleted successfully"
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function handleGetSignedUrl(supabase: any, req: Request) {
  const { filePath, bucketName, expiresIn = 3600 } = await req.json();
  
  if (!filePath || !bucketName) {
    throw new Error("File path and bucket name required");
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

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