import type { Role } from "@/db/schema";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    twoFactorEnabled: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      twoFactorEnabled: boolean;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: Role;
    twoFactorEnabled?: boolean;
    absExp?: number;
    error?: string;
  }
}
