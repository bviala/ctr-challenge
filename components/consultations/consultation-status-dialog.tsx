"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Consultation } from "./types";

type StatusAction = "cancel" | "complete" | "reopen";

const CONFIG: Record<
  StatusAction,
  {
    title: string;
    description: string;
    confirm: string;
    success: string;
    endpoint: string;
    destructive?: boolean;
  }
> = {
  complete: {
    title: "Mark as complete",
    description: "Mark this consultation as completed.",
    confirm: "Mark complete",
    success: "Consultation marked complete.",
    endpoint: "complete",
  },
  reopen: {
    title: "Mark as incomplete",
    description: "Reopen this consultation.",
    confirm: "Mark incomplete",
    success: "Consultation marked incomplete.",
    endpoint: "reopen",
  },
  cancel: {
    title: "Cancel consultation",
    description: "This cancels the consultation. The change is recorded.",
    confirm: "Cancel consultation",
    success: "Consultation cancelled.",
    endpoint: "cancel",
    destructive: true,
  },
};

export function ConsultationStatusDialog({
  consultation,
  action,
  open,
  onOpenChange,
  onDone,
}: {
  consultation: Consultation;
  action: StatusAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const config = CONFIG[action];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/consultations/${consultation.id}/${config.endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: note || null }),
        },
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(json.error ?? "Something went wrong.");
        return;
      }

      toast.success(config.success);
      onOpenChange(false);
      onDone?.();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="status-note">Note (optional)</Label>
            <Textarea
              id="status-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant={config.destructive ? "destructive" : "default"}
              disabled={submitting}
            >
              {submitting && <Spinner className="mr-2" />}
              {config.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
