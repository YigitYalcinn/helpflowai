export type Role = "EMPLOYEE" | "IT_STAFF" | "ADMIN";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_USER" | "RESOLVED" | "CLOSED" | "CANCELLED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

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

export type Department = { id: string; name: string; description?: string };
export type SupportUnit = { id: string; name: string; description?: string; isActive: boolean };
export type Category = { id: string; name: string; description?: string; supportUnitId: string; supportUnit?: SupportUnit; isActive: boolean };

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
};

export type Ticket = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  location?: string | null;
  createdAt: string;
  createdBy?: User;
  department?: Department | null;
  category?: Category;
  supportUnit?: SupportUnit;
  assignedTo?: User | null;
  aiAnalysis?: TicketAiAnalysis | null;
  messages?: TicketMessage[];
  internalNotes?: TicketInternalNote[];
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

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};
