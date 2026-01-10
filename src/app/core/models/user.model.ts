export type UserRole = "client" | "owner" | "admin";

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  birthDate?: string;
  avatarUrl?: string;
}
