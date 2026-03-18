export class CreateProjectDto {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  budget: number;
  departmentId?: number;
}

export class AssignEmployeeDto {
  employeeId: number;
  role: string;
  hoursAllocated: number;
}