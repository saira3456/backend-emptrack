// backend/src/attendance/dto/attendance.dto.ts
export class CreateAttendanceDto {
  employeeId: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  checkIn?: string;
  checkOut?: string;
  overtimeHours?: number;
}

export class UpdateAttendanceDto {
  status?: 'present' | 'absent' | 'late' | 'half_day';
  checkIn?: string;
  checkOut?: string;
  overtimeHours?: number;
}

export class AttendanceResponse {
  id: number;
  employeeId: number;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  overtimeHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DailyAttendanceResponse {
  employee: {
    id: number;
    name: string;
    email: string;
    position: string;
    department: string;
  };
  attendance: AttendanceResponse | null;
}