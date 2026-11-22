"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { AddConsultationDialog } from "@/components/consultations/add-consultation-dialog";
import { ConsultationStatusDialog } from "@/components/consultations/consultation-status-dialog";
import { RescheduleConsultationDialog } from "@/components/consultations/reschedule-consultation-dialog";
import type { Consultation } from "@/components/consultations/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

type Action = "complete" | "reopen" | "cancel" | "reschedule";

export function ConsultationList({ canCreate = false }: { canCreate?: boolean }) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/consultations");
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Could not load consultations.");
      }
      setConsultations((json ?? []) as Consultation[]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load consultations.",
      );
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openAction(consultation: Consultation, next: Action) {
    setSelected(consultation);
    setAction(next);
  }

  function closeAction() {
    setSelected(null);
    setAction(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <div className="flex justify-end">
          <AddConsultationDialog onCreated={refresh} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading consultations…
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      ) : consultations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No consultations yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {consultations.map((consultation) => {
              const isScheduled = consultation.status === "scheduled";
              const isCompleted = consultation.status === "completed";
              const isCancelled = consultation.status === "cancelled";

              return (
                <TableRow key={consultation.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(consultation.scheduled_at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {consultation.first_name} {consultation.last_name}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {consultation.reason}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={consultation.status} />
                  </TableCell>
                  <TableCell>
                    {isCancelled ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Consultation actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isScheduled && (
                            <DropdownMenuItem
                              onClick={() =>
                                openAction(consultation, "complete")
                              }
                            >
                              Mark complete
                            </DropdownMenuItem>
                          )}
                          {isCompleted && (
                            <DropdownMenuItem
                              onClick={() => openAction(consultation, "reopen")}
                            >
                              Mark incomplete
                            </DropdownMenuItem>
                          )}
                          {isScheduled && (
                            <DropdownMenuItem
                              onClick={() =>
                                openAction(consultation, "reschedule")
                              }
                            >
                              Reschedule
                            </DropdownMenuItem>
                          )}
                          {isScheduled && <DropdownMenuSeparator />}
                          {isScheduled && (
                            <DropdownMenuItem
                              onClick={() => openAction(consultation, "cancel")}
                              className="text-destructive"
                            >
                              Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {selected && action === "reschedule" && (
        <RescheduleConsultationDialog
          consultation={selected}
          open
          onOpenChange={(open) => !open && closeAction()}
          onDone={() => void refresh()}
        />
      )}
      {selected &&
        (action === "cancel" ||
          action === "complete" ||
          action === "reopen") && (
          <ConsultationStatusDialog
            consultation={selected}
            action={action}
            open
            onOpenChange={(open) => !open && closeAction()}
            onDone={() => void refresh()}
          />
        )}
    </div>
  );
}

function StatusBadge({ status }: { status: Consultation["status"] }) {
  if (status === "completed") {
    return <Badge>Completed</Badge>;
  }
  if (status === "cancelled") {
    return <Badge variant="destructive">Cancelled</Badge>;
  }
  return <Badge variant="secondary">Scheduled</Badge>;
}
