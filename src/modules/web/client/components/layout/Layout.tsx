import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ToastContainer } from "./ToastContainer";
import { useUIStore } from "../../stores/uiStore";

export function Layout({ children }: { children: React.ReactNode }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-200 ${
          collapsed ? "md:ml-16" : "md:ml-56"
        }`}
      >
        <Header />
        <main className="min-h-0 flex-1 overflow-auto overscroll-contain p-2 sm:p-4 lg:p-5">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}
