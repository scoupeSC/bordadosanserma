import { MobileTabBar, MobileTopBar, Sidebar } from "@/components/layout/app-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh text-[var(--ink)]">
      <Sidebar />
      <div className="app-content lg:pl-[var(--sidebar-w)]">
        <MobileTopBar />
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.75rem)] pt-5 sm:px-6 sm:pt-7 lg:px-10 lg:pb-14 lg:pt-10">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
