import { ToolHeader } from "@/components/tool-shell/tool-header";
import { PageTransition } from "@/components/tool-shell/page-transition";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <ToolHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
