
import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { Loader2 } from "lucide-react";
import NotificationCenter from '@/components/NotificationCenter';
import DashboardCustomizer from '@/components/DashboardCustomizer';

export default function MainLayout() {
  const { profile, loading } = useSimpleAuthContext();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1" />
            <div className="flex items-center gap-2">
              <DashboardCustomizer />
              <NotificationCenter />
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
