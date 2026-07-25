import { Logo } from "@/components/ui/logo";
import { tools } from "@/lib/tools";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm text-foreground-muted">
            A fast, private, all-in-one PDF toolkit that runs entirely in your browser.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:flex sm:gap-16">
          <div>
            <h4 className="font-mono text-xs uppercase tracking-[0.1em] text-foreground-subtle">
              Tools
            </h4>
            <ul className="mt-3 space-y-2">
              {tools.map((tool) => (
                <li key={tool.slug}>
                  <a
                    href={`/app/${tool.slug}`}
                    className="text-sm text-foreground-muted transition-colors hover:text-foreground"
                  >
                    {tool.shortLabel}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-[0.1em] text-foreground-subtle">
              About
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#privacy" className="text-sm text-foreground-muted transition-colors hover:text-foreground">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-sm text-foreground-muted transition-colors hover:text-foreground">
                  How it works
                </a>
              </li>
              <li>
                <a href="#about" className="text-sm text-foreground-muted transition-colors hover:text-foreground">
                  About
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-foreground-subtle sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Fluent PDF. Built for people who just want their PDF fixed.
        </p>
      </div>
    </footer>
  );
}
