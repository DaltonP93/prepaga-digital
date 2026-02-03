
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Document = Tables<"documents">;
type DocumentInsert = TablesInsert<"documents">;
type DocumentUpdate = TablesUpdate<"documents">;

export const useDocuments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      console.log("Fetching documents...");
      
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          sales:sale_id(id, status)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        throw error;
      }

      console.log("Documents fetched:", data?.length || 0);
      return data;
    },
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (document: DocumentInsert) => {
      console.log("Creating document:", document);
      const { data, error } = await supabase
        .from("documents")
        .insert([document])
        .select()
        .single();

      if (error) {
        console.error("Error creating document:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({
        title: "Documento creado",
        description: "El documento se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error creating document:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el documento.",
        variant: "destructive",
      });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DocumentUpdate }) => {
      console.log("Updating document:", id, updates);
      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating document:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({
        title: "Documento actualizado",
        description: "El documento se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error updating document:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el documento.",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Deleting document:", id);
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting document:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({
        title: "Documento eliminado",
        description: "El documento se ha eliminado exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento.",
        variant: "destructive",
      });
    },
  });

  return {
    documents,
    isLoading,
    error,
    createDocument: createDocumentMutation.mutate,
    updateDocument: updateDocumentMutation.mutate,
    deleteDocument: deleteDocumentMutation.mutate,
    isCreating: createDocumentMutation.isPending,
    isUpdating: updateDocumentMutation.isPending,
    isDeleting: deleteDocumentMutation.isPending,
  };
};
