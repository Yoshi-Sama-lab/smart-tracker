import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#09090b] text-zinc-50 font-sans">
        <AppSidebar />
        <main className="flex-1 overflow-auto flex flex-col relative">
          {/* Darkened the header, removed harsh borders, added a subtle blur */}
          <header className="sticky top-0 z-10 flex h-14 items-center border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md px-4 gap-4">
            <SidebarTrigger className="text-zinc-400 hover:text-zinc-100 transition-colors" />
            <div className="text-sm font-medium text-zinc-500">
              Smart OS Dashboard
            </div>
          </header>
          <div className="p-6 flex-1">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}