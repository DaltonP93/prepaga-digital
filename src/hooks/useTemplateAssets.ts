import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fromAnyTable } from '@/integrations/supabase/untyped-client';
import { useToast } from '@/hooks/use-toast';
import type { TemplateAsset, TemplateAssetInsert, TemplateAssetPage } from '@/types/templateDesigner';

export const useTemplateAssets = (templateId?: string) => {
  return useQuery({
    queryKey: ['template-assets', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await fromAnyTable('template_assets')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as TemplateAsset[];
    },
    enabled: !!templateId,
  });
};

export const useTemplateAssetPages = (assetId?: string) => {
  return useQuery({
    queryKey: ['template-asset-pages', assetId],
    queryFn: async () => {
      if (!assetId) return [];
      const { data, error } = await fromAnyTable('template_asset_pages')
        .select('*')
        .eq('asset_id', assetId)
        .order('page_number', { ascending: true });
      if (error) throw error;
      return data as unknown as TemplateAssetPage[];
    },
    enabled: !!assetId,
  });
};

export const useCreateTemplateAsset = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: TemplateAssetInsert) => {
      const { data, error } = await fromAnyTable('template_assets')
        .insert(asset as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TemplateAsset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-assets', data.template_id] });
      toast({ title: 'Asset agregado', description: 'El archivo fue guardado correctamente.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCreateTemplateAssetPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (page: Omit<TemplateAssetPage, 'id' | 'created_at'>) => {
      const { data, error } = await fromAnyTable('template_asset_pages')
        .insert(page as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TemplateAssetPage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-asset-pages', data.asset_id] });
    },
  });
};

export const useBulkCreateAssetPages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pages: Omit<TemplateAssetPage, 'id' | 'created_at'>[]) => {
      if (pages.length === 0) return [];
      const { data, error } = await fromAnyTable('template_asset_pages')
        .insert(pages as any)
        .select();
      if (error) throw error;
      return data as unknown as TemplateAssetPage[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['template-asset-pages', data[0].asset_id] });
      }
    },
  });
};

export const useDeleteTemplateAsset = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await fromAnyTable('template_assets').delete().eq('id', id);
      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['template-assets', templateId] });
      toast({ title: 'Asset eliminado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};