"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { AddConsultationDialog } from "@/components/consultations/add-consultation-dialog";
import { ConsultationStatusDialog } from "@/components/consultations/consultation-status-dialog";
import { RescheduleConsultationDialog } from "@/components/consultations/reschedule-consultation-dialog";
import { StatusBadge } from "@/components/consultations/status-badge";
import type { Consultation } from "@/components/consultations/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [action, setAction] = useState<Action | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/consultations");
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error ?? "Could not load consultations.");
      }

      setError(null);
      setConsultations((json ?? []) as Consultation[]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load consultations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load. refresh() is async and only updates state after the fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <ConsultationListSkeleton />
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
                <TableRow
                  key={consultation.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() =>
                    router.push(`/consultations/${consultation.id}`)
                  }
                  onKeyDown={(e) => {
                    if (
                      e.target === e.currentTarget &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      router.push(`/consultations/${consultation.id}`);
                    }
                  }}
                >
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
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
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

function ConsultationListSkeleton() {
  return (
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
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-4 w-36" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-48" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-20 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-8 rounded-md" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

