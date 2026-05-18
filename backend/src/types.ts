import { Role } from "@prisma/client";

export type AuthUser = {
  id: string;
  role: Role;
  departmentId: string | null;
  supportUnitId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
