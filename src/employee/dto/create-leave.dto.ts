export class CreateLeaveDto {
  employeeId: number;
  type: 'sick' | 'vacation' | 'personal' | 'maternity' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
}

export class UpdateLeaveStatusDto {
  status: 'approved' | 'rejected';
  approvedBy?: string;
}