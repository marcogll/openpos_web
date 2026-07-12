import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ToastContainer } from "./ToastContainer";
import { useUIStore } from "../../stores/uiStore";

export function Layout({ children }: { children: React.ReactNode }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${
          collapsed ? "ml-16" : "ml-56"
        }`}
      >
        <Header />
        <main className="flex-1 overflow-auto p-4 lg:p-5">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}
