"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { toast } from "sonner";

// FIX: Replaced window.confirm() with a proper Dialog component.
//
// window.confirm() is:
//   • Synchronous — it blocks the main thread and pauses JavaScript execution.
//   • Un-styleable — appearance is controlled by the OS/browser, not the app.
//   • Suppressed in some contexts — iframes, browser extensions, and certain
//     automation environments silently return `false` without showing the dialog.
//   • Inconsistent — behaviour and wording differ across browsers and platforms.
//
// The Dialog component matches the pattern already used for destructive actions
// elsewhere in the app (e.g. AccountClient "Delete Account" confirmation).

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/interview/session/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setOpen(false);
      toast.success("Session deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        onClick={() => setOpen(true)}
        disabled={pending}
        title="Delete session"
      >
        <Trash2 className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-error">
              <Trash2 className="size-5" />
              Delete this session?
            </DialogTitle>
            <DialogDescription>
              This action is <strong>permanent and cannot be undone</strong>.
              Your transcript and feedback for this session will be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="gap-2 bg-error/10 text-error hover:bg-error/20 hover:text-error"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {pending ? "Deleting…" : "Delete Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
