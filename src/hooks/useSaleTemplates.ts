import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type SaleTemplate = Tables<"sale_templates">;
type SaleTemplateInsert = TablesInsert<"sale_templates">;
type SaleTemplateUpdate = TablesUpdate<"sale_templates">;

export const useSaleTemplates = (saleId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: saleTemplates, isLoading } = useQuery({
    queryKey: ["sale-templates", saleId],
    queryFn: async () => {
      if (!saleId) return [];
      
      console.log("Fetching sale templates for sale:", saleId);
      const { data, error } = await supabase
        .from("sale_templates")
        .select(`
          *,
          template:templates(
            id,
            name,
            template_type,
            description,
            static_content,
            dynamic_fields
          )
        `)
        .eq("sale_id", saleId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error fetching sale templates:", error);
        throw error;
      }

      console.log("Sale templates fetched:", data);
      return data;
    },
    enabled: !!saleId,
  });

  const addSaleTemplateMutation = useMutation({
    mutationFn: async (saleTemplate: SaleTemplateInsert) => {
      console.log("Adding sale template:", saleTemplate);
      const { data, error } = await supabase
        .from("sale_templates")
        .insert([saleTemplate])
        .select()
        .single();

      if (error) {
        console.error("Error adding sale template:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-templates"] });
      toast({
        title: "Template agregado",
        description: "El template se ha agregado a la venta exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error adding sale template:", error);
      toast({
        title: "Error",
        description: "No se pudo agregar el template a la venta.",
        variant: "destructive",
      });
    },
  });

  const updateSaleTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SaleTemplateUpdate }) => {
      console.log("Updating sale template:", id, updates);
      const { data, error } = await supabase
        .from("sale_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating sale template:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-templates"] });
      toast({
        title: "Template actualizado",
        description: "El template se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error updating sale template:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el template.",
        variant: "destructive",
      });
    },
  });

  const removeSaleTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Removing sale template:", id);
      const { error } = await supabase
        .from("sale_templates")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error removing sale template:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-templates"] });
      toast({
        title: "Template removido",
        description: "El template se ha removido de la venta exitosamente.",
      });
    },
    onError: (error) => {
      console.error("Error removing sale template:", error);
      toast({
        title: "Error",
        description: "No se pudo remover el template de la venta.",
        variant: "destructive",
      });
    },
  });

  return {
    saleTemplates,
    isLoading,
    addSaleTemplate: addSaleTemplateMutation.mutate,
    updateSaleTemplate: updateSaleTemplateMutation.mutate,
    removeSaleTemplate: removeSaleTemplateMutation.mutate,
    isAdding: addSaleTemplateMutation.isPending,
    isUpdating: updateSaleTemplateMutation.isPending,
    isRemoving: removeSaleTemplateMutation.isPending,
  };
};