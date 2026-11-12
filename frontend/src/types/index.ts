export type Role = "EMPLOYEE" | "IT_STAFF" | "ADMIN";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_USER" | "RESOLVED" | "CLOSED" | "CANCELLED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type AiSource = "openai" | "rules";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId?: string | null;
  supportUnitId?: string | null;
  department?: Department | null;
  supportUnit?: SupportUnit | null;
};

export type UserBrief = Pick<User, "id" | "name"> & { email?: string };

export type Department = { id: string; name: string; description?: string | null };
export type SupportUnit = { id: string; name: string; description?: string | null; isActive: boolean };
export type Category = { id: string; name: string; description?: string | null; supportUnitId: string; supportUnit?: SupportUnit; isActive: boolean };

export type AiAnalysisResult = {
  summary: string;
  category: string;
  supportUnit: string;
  priority: TicketPriority;
  impact: string;
  possibleCauses: string[];
  suggestedSolutions: string[];
  questionsToAsk: string[];
  confidenceScore: number;
  source: AiSource;
};

export type TicketAiAnalysis = {
  summary: string;
  suggestedCategory: string;
  suggestedSupportUnit: string;
  suggestedPriority: TicketPriority;
  impact: string;
  possibleCauses: string[];
  suggestedSolutions: string[];
  questionsToAsk: string[];
  confidenceScore: number;
  rawResponse?: { source?: AiSource; rerouted?: boolean; requestedCategory?: string } | null;
};

export type TicketMessage = {
  id: string;
  message: string;
  createdAt: string;
  sender?: Pick<User, "id" | "name" | "role">;
};

export type TicketInternalNote = {
  id: string;
  note: string;
  createdAt: string;
  author?: Pick<User, "id" | "name">;
};

export type TicketAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy?: Pick<User, "id" | "name">;
};

export type StatusHistoryItem = {
  id: string;
  oldStatus: TicketStatus | null;
  newStatus: TicketStatus;
  createdAt: string;
  changedBy?: Pick<User, "id" | "name">;
};

export type AssignmentHistoryItem = {
  id: string;
  reason: string | null;
  createdAt: string;
  fromSupportUnit?: SupportUnit | null;
  toSupportUnit?: SupportUnit | null;
  fromAssignedToName: string | null;
  toAssignedToName: string | null;
  changedBy?: Pick<User, "id" | "name">;
};

export type SatisfactionRating = { score: number; comment?: string | null; createdAt?: string };

export type Ticket = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdBy?: UserBrief;
  department?: Department | null;
  category?: Category;
  supportUnit?: SupportUnit;
  assignedTo?: UserBrief | null;
  aiAnalysis?: TicketAiAnalysis | null;
  messages?: TicketMessage[];
  internalNotes?: TicketInternalNote[];
  attachments?: TicketAttachment[];
  statusHistory?: StatusHistoryItem[];
  assignmentHistory?: AssignmentHistoryItem[];
  satisfactionRating?: SatisfactionRating | null;
  _count?: { messages: number; attachments: number };
};

export type TrendPoint = { date: string; created: number; resolved: number };
export type Satisfaction = { average: number | null; count: number };
export type ReportRow = { label: string; count: number };

export type DashboardData = {
  role: Role;
  total: number;
  open: number;
  inProgress: number;
  waitingUser: number;
  resolved: number;
  closed: number;
  urgent: number;
  unassigned: number;
  assignedToMe: number;
  avgResolutionHours: number | null;
  satisfaction: Satisfaction;
  byStatus: { status: TicketStatus; count: number }[];
  openByPriority: { priority: TicketPriority; count: number }[];
  trend: TrendPoint[];
  recent: Ticket[];
};

export type ReportOverview = {
  byCategory: ReportRow[];
  bySupportUnit: ReportRow[];
  byDepartment: ReportRow[];
  byPriority: ReportRow[];
  byStatus: ReportRow[];
  byStaff: ReportRow[];
  trend: TrendPoint[];
  kpis: { total: number; avgResolutionHours: number | null; satisfaction: Satisfaction; aiAccuracy: number | null; aiAnalyzed: number };
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};
