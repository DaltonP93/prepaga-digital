import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, startOfDay, endOfDay } from "date-fns";

export interface TemplateAnalytics {
  id: string;
  template_id: string;
  event_type: "view" | "edit" | "pdf_generated" | "shared" | "duplicated";
  user_id: string | null;
  session_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AnalyticsMetrics {
  totalViews: number;
  totalEdits: number;
  totalPDFsGenerated: number;
  totalShares: number;
  totalDuplications: number;
  dailyActivity: Array<{
    date: string;
    views: number;
    edits: number;
    pdf_generated: number;
  }>;
  topUsers: Array<{
    user_id: string;
    user_name: string;
    event_count: number;
  }>;
  eventTrends: Array<{
    event_type: string;
    count: number;
    percentage: number;
  }>;
}

export const useTemplateAnalytics = (templateId?: string, days = 30) => {
  const fromDate = subDays(new Date(), days);
  const toDate = new Date();

  // Get analytics data
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
  } = useQuery({
    queryKey: ["template-analytics", templateId, days],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from("template_analytics")
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .eq("template_id", templateId)
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (TemplateAnalytics & {
        user?: { first_name: string; last_name: string };
      })[];
    },
    enabled: !!templateId,
  });

  // Process metrics
  const metrics: AnalyticsMetrics | null = analytics ? (() => {
    const totalViews = analytics.filter(a => a.event_type === "view").length;
    const totalEdits = analytics.filter(a => a.event_type === "edit").length;
    const totalPDFsGenerated = analytics.filter(a => a.event_type === "pdf_generated").length;
    const totalShares = analytics.filter(a => a.event_type === "shared").length;
    const totalDuplications = analytics.filter(a => a.event_type === "duplicated").length;

    // Daily activity
    const dailyMap = new Map<string, { views: number; edits: number; pdf_generated: number }>();
    
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      dailyMap.set(date, { views: 0, edits: 0, pdf_generated: 0 });
    }

    analytics.forEach(item => {
      const date = format(new Date(item.created_at), "yyyy-MM-dd");
      const dayData = dailyMap.get(date);
      if (dayData) {
        if (item.event_type === "view") dayData.views++;
        else if (item.event_type === "edit") dayData.edits++;
        else if (item.event_type === "pdf_generated") dayData.pdf_generated++;
      }
    });

    const dailyActivity = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top users
    const userMap = new Map<string, { name: string; count: number }>();
    analytics.forEach(item => {
      if (item.user_id && item.user) {
        const userId = item.user_id;
        const userName = `${item.user.first_name} ${item.user.last_name}`;
        const existing = userMap.get(userId);
        if (existing) {
          existing.count++;
        } else {
          userMap.set(userId, { name: userName, count: 1 });
        }
      }
    });

    const topUsers = Array.from(userMap.entries())
      .map(([user_id, data]) => ({
        user_id,
        user_name: data.name,
        event_count: data.count,
      }))
      .sort((a, b) => b.event_count - a.event_count)
      .slice(0, 5);

    // Event trends
    const eventCounts = analytics.reduce((acc, item) => {
      acc[item.event_type] = (acc[item.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalEvents = analytics.length;
    const eventTrends = Object.entries(eventCounts).map(([event_type, count]) => ({
      event_type,
      count,
      percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
    }));

    return {
      totalViews,
      totalEdits,
      totalPDFsGenerated,
      totalShares,
      totalDuplications,
      dailyActivity,
      topUsers,
      eventTrends,
    };
  })() : null;

  return {
    analytics,
    metrics,
    isLoadingAnalytics,
    analyticsError,
  };
};

export const useCompanyAnalytics = (days = 30) => {
  const fromDate = subDays(new Date(), days);
  const toDate = new Date();

  // Get company-wide analytics
  const {
    data: companyAnalytics,
    isLoading: isLoadingCompanyAnalytics,
    error: companyAnalyticsError,
  } = useQuery({
    queryKey: ["company-analytics", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_analytics")
        .select(`
          *,
          template:templates(name, template_type),
          user:profiles(first_name, last_name)
        `)
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Get template usage stats
  const {
    data: templateStats,
    isLoading: isLoadingTemplateStats,
  } = useQuery({
    queryKey: ["template-stats", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_analytics")
        .select(`
          template_id,
          event_type,
          template:templates(name, template_type)
        `)
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString());

      if (error) throw error;

      // Group by template
      const templateMap = new Map();
      data.forEach(item => {
        const templateId = item.template_id;
        if (!templateMap.has(templateId)) {
          templateMap.set(templateId, {
            template_id: templateId,
            template_name: item.template?.name || "Unknown",
            template_type: item.template?.template_type || "unknown",
            views: 0,
            edits: 0,
            pdf_generated: 0,
            total_events: 0,
          });
        }
        
        const stats = templateMap.get(templateId);
        stats.total_events++;
        if (item.event_type === "view") stats.views++;
        else if (item.event_type === "edit") stats.edits++;
        else if (item.event_type === "pdf_generated") stats.pdf_generated++;
      });

      return Array.from(templateMap.values())
        .sort((a, b) => b.total_events - a.total_events);
    },
  });

  return {
    companyAnalytics,
    templateStats,
    isLoadingCompanyAnalytics,
    isLoadingTemplateStats,
    companyAnalyticsError,
  };
};