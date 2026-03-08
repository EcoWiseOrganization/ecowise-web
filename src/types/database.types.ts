export interface User {
  id: string;
  email: string;
  full_name: string | null;
  user_name: string | null;
  is_admin: boolean;
  status: string;
  green_points: number;
  created_at: string;
}
