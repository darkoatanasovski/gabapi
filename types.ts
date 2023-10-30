export type User = {
  id?: number;
  username: string;
  email: string;
  token?: string;
  note?: string;
  avatar?: string;
  skipped?: boolean;
  created_at?: string;
  updated_at?: string;
};
