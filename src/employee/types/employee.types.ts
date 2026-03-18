export interface Employee {
  id?: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  department_id?: number;
  salary: number;
  status: 'active' | 'inactive' | 'on-leave';
  join_date: string;
  password?: string;
  created_at?: string;
  updated_at?: string;
}