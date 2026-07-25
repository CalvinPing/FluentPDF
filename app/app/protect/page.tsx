"use client";

import { useState } from "react";
import { Lock, LockOpen, Loader2, Eye, EyeOff } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { ToolIntro } from "@/components/tool-shell/tool-intro";
import { Button } from "@/components/ui/button";
import { LoadedFileBar } from "@/components/tool-shell/loaded-file-bar";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";
import { downloadBytes, readFileAsBytes, stripExtension } from "@/lib/download";
import { useToastStore } from "@/lib/toast-store";
import { cn } from "@/lib/cn";

type Mode = "unlock" | "lock";

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-foreground-muted">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border-strong bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none focus-visible:border-primary"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-foreground-subtle transition-colors hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function ProtectPage() {
  const [mode, setMode] = useState<Mode>("unlock");
  const [name, setName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  // null = still checking. `encrypted` gates both modes; `emptyPasswordWorks` only applies
  // once we know the file is encrypted, distinguishing "just restricts permissions" (auto-unlock,
  // no password needed) from "actually requires a password to open" (needs one from the user).
  const [encrypted, setEncrypted] = useState<boolean | null>(null);
  const [emptyPasswordWorks, setEmptyPasswordWorks] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const push = useToastStore((s) => s.push);

  const resetFileState = () => {
    setName(null);
    setBytes(null);
    setEncrypted(null);
    setEmptyPasswordWorks(null);
    setPassword("");
    setConfirmPassword("");
  };

  const onFiles = async ([file]: File[]) => {
    const fileBytes = await readFileAsBytes(file);
    setName(file.name);
    setBytes(fileBytes);
    setPassword("");
    setConfirmPassword("");
    setEncrypted(null);
    setEmptyPasswordWorks(null);

    const isEncrypted = await getPdfWorker().isPdfEncrypted(fileBytes);
    setEncrypted(isEncrypted);
    if (isEncrypted && mode === "unlock") {
      setEmptyPasswordWorks(await getPdfWorker().unlocksWithEmptyPassword(fileBytes));
    }
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    resetFileState();
  };

  const handleUnlock = async () => {
    if (!bytes) return;
    setBusy(true);
    try {
      const out = await getPdfWorker().unlockPdf(bytes, emptyPasswordWorks ? "" : password);
      downloadBytes(out, `${stripExtension(name ?? "document")}-unlocked.pdf`);
      push("success", "Password protection removed.");
    } catch (err) {
      // Comlink reconstructs thrown errors as plain Error instances on this side of the worker
      // boundary — the original WrongPasswordError/UnsupportedEncryptionError class identity
      // doesn't survive, but .name (set in each constructor) does.
      if (err instanceof Error && err.name === "WrongPasswordError") {
        push("error", "That password doesn't match this PDF.");
      } else if (err instanceof Error && err.name === "UnsupportedEncryptionError") {
        push("error", err.message);
      } else {
        push("error", "Couldn't unlock that file — please check it's a valid PDF.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLock = async () => {
    if (!bytes) return;
    if (!password) {
      push("error", "Enter a password first.");
      return;
    }
    if (password !== confirmPassword) {
      push("error", "Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const out = await getPdfWorker().lockPdf(bytes, password);
      downloadBytes(out, `${stripExtension(name ?? "document")}-locked.pdf`);
      push("success", "Password added — keep it somewhere safe, it can't be recovered.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Couldn't lock that file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <ToolIntro
        icon={Lock}
        title="Protect PDF"
        description="Add a password to lock a PDF, or remove one you already know."
      />

      <div className="mb-6 inline-flex items-center gap-1 rounded-xl border border-border bg-background-secondary p-1">
        <button
          type="button"
          onClick={() => switchMode("unlock")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150",
            mode === "unlock" ? "bg-primary text-on-primary" : "text-foreground-muted hover:text-foreground",
          )}
        >
          <LockOpen size={15} /> Remove password
        </button>
        <button
          type="button"
          onClick={() => switchMode("lock")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150",
            mode === "lock" ? "bg-primary text-on-primary" : "text-foreground-muted hover:text-foreground",
          )}
        >
          <Lock size={15} /> Add password
        </button>
      </div>

      {!bytes && (
        <Dropzone
          onFiles={onFiles}
          label={
            mode === "unlock" ? "Drop a protected PDF here, or click to browse" : "Drop a PDF here, or click to browse"
          }
        />
      )}

      {bytes && (
        <div className="flex flex-col gap-4">
          <LoadedFileBar name={name ?? "document.pdf"} onChangeFile={resetFileState} />

          {mode === "unlock" && (
            <>
              {encrypted === null && <p className="text-sm text-foreground-muted">Checking this file…</p>}

              {encrypted === false && (
                <p className="rounded-xl border border-border bg-background-secondary px-4 py-3 text-sm text-foreground-muted">
                  This PDF isn&apos;t password-protected — there&apos;s nothing to remove.
                </p>
              )}

              {encrypted === true && emptyPasswordWorks === null && (
                <p className="text-sm text-foreground-muted">Checking whether a password is needed…</p>
              )}

              {encrypted === true && emptyPasswordWorks === true && (
                <div className="rounded-xl border border-border bg-background-secondary px-4 py-4">
                  <p className="text-sm text-foreground-muted">
                    This PDF only restricts permissions (printing, copying, etc.) — no password is needed to
                    open it, so it can be removed right away.
                  </p>
                  <Button className="mt-3" onClick={handleUnlock} disabled={busy} size="lg">
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <LockOpen size={18} />}
                    {busy ? "Removing…" : "Remove protection"}
                  </Button>
                </div>
              )}

              {encrypted === true && emptyPasswordWorks === false && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUnlock();
                  }}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background-secondary px-4 py-4"
                >
                  <PasswordField
                    id="unlock-password"
                    label="This PDF's password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter the password"
                    autoFocus
                  />
                  <Button type="submit" disabled={busy || !password} className="self-start" size="lg">
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <LockOpen size={18} />}
                    {busy ? "Unlocking…" : "Unlock"}
                  </Button>
                </form>
              )}
            </>
          )}

          {mode === "lock" && (
            <>
              {encrypted === null && <p className="text-sm text-foreground-muted">Checking this file…</p>}

              {encrypted === true && (
                <p className="rounded-xl border border-border bg-background-secondary px-4 py-3 text-sm text-foreground-muted">
                  This PDF is already password-protected — remove its password first, then add a new one.
                </p>
              )}

              {encrypted === false && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLock();
                  }}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background-secondary px-4 py-4"
                >
                  <PasswordField
                    id="lock-password"
                    label="New password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Choose a password"
                    autoFocus
                  />
                  <PasswordField
                    id="lock-confirm-password"
                    label="Confirm password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Type it again"
                  />
                  <Button type="submit" disabled={busy || !password} className="self-start" size="lg">
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                    {busy ? "Locking…" : "Add password"}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
