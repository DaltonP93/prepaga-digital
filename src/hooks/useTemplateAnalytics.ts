import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";

// This hook works with the actual template_analytics table schema:
// id, template_id, views_count, completions_count, avg_completion_time, last_used_at, created_at, updated_at

export interface TemplateAnalyticsData {
  id: string;
  template_id: string;
  views_count: number;
  completions_count: number;
  avg_completion_time: number | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsMetrics {
  totalViews: number;
  totalCompletions: number;
  avgCompletionTime: number | null;
  lastUsedAt: string | null;
}

export const useTemplateAnalytics = (templateId?: string) => {
  const queryClient = useQueryClient();

  // Get analytics data for a specific template
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
  } = useQuery({
    queryKey: ["template-analytics", templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from("template_analytics")
        .select("*")
        .eq("template_id", templateId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as TemplateAnalyticsData | null;
    },
    enabled: !!templateId,
  });

  // Increment view count
  const trackViewMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // Check if analytics record exists
      const { data: existing } = await supabase
        .from("template_analytics")
        .select("id, views_count")
        .eq("template_id", templateId)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("template_analytics")
          .update({
            views_count: (existing.views_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      }
      // Note: If no record exists, we can't insert due to RLS restrictions
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-analytics"] });
    },
  });

  // Track completion
  const trackCompletionMutation = useMutation({
    mutationFn: async ({
      templateId,
      completionTimeMs,
    }: {
      templateId: string;
      completionTimeMs?: number;
    }) => {
      const { data: existing } = await supabase
        .from("template_analytics")
        .select("id, completions_count, avg_completion_time")
        .eq("template_id", templateId)
        .single();

      if (existing) {
        const newCount = (existing.completions_count || 0) + 1;
        let newAvg = existing.avg_completion_time;

        if (completionTimeMs) {
          const oldAvg = existing.avg_completion_time || 0;
          const oldCount = existing.completions_count || 0;
          newAvg = Math.round((oldAvg * oldCount + completionTimeMs) / newCount);
        }

        const { error } = await supabase
          .from("template_analytics")
          .update({
            completions_count: newCount,
            avg_completion_time: newAvg,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-analytics"] });
    },
  });

  const metrics: AnalyticsMetrics | null = analytics
    ? {
        totalViews: analytics.views_count || 0,
        totalCompletions: analytics.completions_count || 0,
        avgCompletionTime: analytics.avg_completion_time,
        lastUsedAt: analytics.last_used_at,
      }
    : null;

  return {
    analytics,
    metrics,
    isLoadingAnalytics,
    analyticsError,
    trackView: (templateId: string) => trackViewMutation.mutate(templateId),
    trackCompletion: trackCompletionMutation.mutate,
  };
};

export const useCompanyAnalytics = () => {
  // Get all template analytics for the company
  const {
    data: companyAnalytics,
    isLoading: isLoadingCompanyAnalytics,
    error: companyAnalyticsError,
  } = useQuery({
    queryKey: ["company-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_analytics")
        .select(`
          *,
          templates(id, name, description)
        `)
        .order("views_count", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate aggregated stats
  const templateStats = companyAnalytics?.map((item) => ({
    template_id: item.template_id,
    template_name: (item.templates as any)?.name || "Unknown",
    views: item.views_count || 0,
    completions: item.completions_count || 0,
    avg_completion_time: item.avg_completion_time,
    last_used_at: item.last_used_at,
  })) || [];

  return {
    companyAnalytics,
    templateStats,
    isLoadingCompanyAnalytics,
    companyAnalyticsError,
  };
};
