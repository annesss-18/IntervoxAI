"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container, PageHeader } from "@/components/layout/Container";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import {
  UserCog,
  Save,
  Loader2,
  Trash2,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

interface AccountClientProps {
  userName: string;
  userEmail: string;
}

export default function AccountClient({
  userName,
  userEmail,
}: AccountClientProps) {
  const router = useRouter();

  // ── Profile form state ──
  const [name, setName] = useState(userName);
  const [isSaving, setIsSaving] = useState(false);

  // ── Delete confirmation state ──
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isNameValid = name.trim().length >= 2 && name.trim() !== userName;
  const isDeleteConfirmed = deleteConfirmText === "DELETE";

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameValid || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update name");
      }

      toast.success("Display name updated");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update name",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!isDeleteConfirmed || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete account");
      }

      toast.success("Account deleted. Redirecting…");
      // Small delay so the toast is visible
      setTimeout(() => {
        window.location.assign("/sign-in");
      }, 1200);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account",
      );
      setIsDeleting(false);
    }
  };

  return (
    <Container size="sm">
      <PageHeader
        title="Account Settings"
        description="Manage your profile and account preferences."
      />

      {/* ── Profile Section ── */}
      <section className="mb-10 rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <UserCog className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="text-sm text-muted-foreground">
              Update your personal information
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateName} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="account-email">Email</Label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/50 px-4 py-2.5 text-sm text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              {userEmail}
            </div>
            <p className="text-xs text-muted-foreground">
              Email is managed by your sign-in provider and cannot be changed
              here.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-name">Display Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              maxLength={100}
              minLength={2}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              2–100 characters. This name is shown across your dashboard and
              interviews.
            </p>
          </div>

          <Button
            type="submit"
            variant="gradient"
            disabled={!isNameValid || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </section>

      {/* ── Danger Zone ── */}
      <section className="rounded-2xl border border-error/30 bg-error/[0.03] p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-error/10">
            <AlertTriangle className="size-5 text-error" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-error">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">
              Irreversible actions that permanently affect your account
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data including
              interviews, feedback, and templates.
            </p>
          </div>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="shrink-0 gap-2 border border-error/30 text-error hover:bg-error/10 hover:text-error"
              >
                <Trash2 className="size-4" />
                Delete Account
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-error">
                  <AlertTriangle className="size-5" />
                  Delete Account
                </DialogTitle>
                <DialogDescription>
                  This action is <strong>permanent and cannot be undone</strong>
                  . All your interviews, feedback, and personal data will be
                  permanently deleted.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <Label htmlFor="delete-confirm">
                  Type <span className="font-mono font-bold">DELETE</span> to
                  confirm
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) =>
                    setDeleteConfirmText(e.target.value.toUpperCase())
                  }
                  placeholder="DELETE"
                  className="h-11 rounded-xl font-mono tracking-widest"
                  autoComplete="off"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeleteConfirmText("");
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  className="gap-2 bg-error/10 text-error hover:bg-error/20 hover:text-error"
                  disabled={!isDeleteConfirmed || isDeleting}
                  onClick={handleDeleteAccount}
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {isDeleting ? "Deleting…" : "Permanently Delete My Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </Container>
  );
}
