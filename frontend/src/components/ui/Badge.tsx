import { TicketPriority, TicketStatus } from "../../types";
import { cn } from "../../lib/utils";

const statusClass: Record<TicketStatus, string> = {
  OPEN: "bg-sky-50 text-sky-700 ring-sky-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-200",
  WAITING_USER: "bg-violet-50 text-violet-700 ring-violet-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200"
};

const priorityClass: Record<TicketPriority, string> = {
  LOW: "bg-slate-50 text-slate-600 ring-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 ring-blue-200",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-200",
  URGENT: "bg-red-50 text-red-700 ring-red-200"
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusClass[status])}>{status.replace("_", " ")}</span>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", priorityClass[priority])}>{priority}</span>;
}
