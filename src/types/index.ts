import { LucideIcon } from 'lucide-react';

export interface MainNavItem {
  title: string;
  url: string;
  icon: any;
  visible?: boolean;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  company_id?: string;
}
