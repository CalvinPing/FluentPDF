import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TabNav } from "@/components/tool-shell/tab-nav";

export function ToolHeader() {
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <ThemeToggle />
      </div>
      <TabNav />
    </div>
  );
}
