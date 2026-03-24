// backend/src/employee/services/attendance.service.ts
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateAttendanceDto, UpdateAttendanceDto, DailyAttendanceResponse } from '../dto/create-attendance.dto';

@Injectable()
export class AttendanceService {
  private pool: Pool;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
      });
    } else {
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'emptrack',
      });
    }
  }

  async getAttendanceByDate(date: string): Promise<DailyAttendanceResponse[]> {
    const query = `
      SELECT 
        e.id as employee_id,
        e.name,
        e.email,
        e.position,
        d.name as department,
        a.id as attendance_id,
        a.date,
        a.status,
        a.check_in,
        a.check_out,
        a.overtime_hours,
        a.created_at,
        a.updated_at
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
      WHERE e.status = 'active'
      ORDER BY e.name
    `;
    
    const result = await this.pool.query(query, [date]);
    
    return result.rows.map(row => ({
      employee: {
        id: row.employee_id,
        name: row.name,
        email: row.email,
        position: row.position,
        department: row.department || 'N/A'
      },
      attendance: row.attendance_id ? {
        id: row.attendance_id,
        employeeId: row.employee_id,
        date: row.date,
        status: row.status,
        checkIn: row.check_in,
        checkOut: row.check_out,
        overtimeHours: row.overtime_hours || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } : null
    }));
  }

  async markAttendance(createDto: CreateAttendanceDto): Promise<any> {
    const query = `
      INSERT INTO attendance (employee_id, date, status, check_in, check_out, overtime_hours)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (employee_id, date) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        check_in = COALESCE(EXCLUDED.check_in, attendance.check_in),
        check_out = COALESCE(EXCLUDED.check_out, attendance.check_out),
        overtime_hours = EXCLUDED.overtime_hours,
        updated_at = NOW()
      RETURNING id, employee_id as "employeeId", date, status, check_in as "checkIn", check_out as "checkOut", overtime_hours as "overtimeHours"
    `;
    
    const result = await this.pool.query(query, [
      createDto.employeeId,
      createDto.date,
      createDto.status,
      createDto.checkIn || null,
      createDto.checkOut || null,
      createDto.overtimeHours || 0
    ]);
    
    return result.rows[0];
  }

  async bulkMarkAttendance(date: string, status: string): Promise<{ success: boolean; count: number }> {
    const employees = await this.pool.query(
      'SELECT id FROM employees WHERE status = $1',
      ['active']
    );
    
    const results: any[] = []; // Explicitly type the array
    for (const emp of employees.rows) {
      const result = await this.markAttendance({
        employeeId: emp.id,
        date,
        status: status as any
      });
      results.push(result);
    }
    
    return { success: true, count: results.length };
  }

  async updateAttendance(id: number, updateDto: UpdateAttendanceDto): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updateDto.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updateDto.status);
    }
    if (updateDto.checkIn !== undefined) {
      fields.push(`check_in = $${paramIndex++}`);
      values.push(updateDto.checkIn);
    }
    if (updateDto.checkOut !== undefined) {
      fields.push(`check_out = $${paramIndex++}`);
      values.push(updateDto.checkOut);
    }
    if (updateDto.overtimeHours !== undefined) {
      fields.push(`overtime_hours = $${paramIndex++}`);
      values.push(updateDto.overtimeHours);
    }
    
    const query = `
      UPDATE attendance 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, employee_id as "employeeId", date, status, check_in as "checkIn", check_out as "checkOut", overtime_hours as "overtimeHours"
    `;
    
    values.push(id);
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getAttendanceSummary(startDate: string, endDate: string): Promise<any[]> {
    const query = `
      SELECT 
        a.date,
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
        COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_day,
        COALESCE(SUM(a.overtime_hours), 0) as total_overtime,
        ROUND(
          COUNT(CASE WHEN a.status IN ('present', 'late', 'half_day') THEN 1 END)::numeric / 
          NULLIF(COUNT(DISTINCT e.id), 0) * 100, 
          2
        ) as attendance_rate
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date BETWEEN $1 AND $2
      WHERE e.status = 'active'
      GROUP BY a.date
      ORDER BY a.date DESC
    `;
    
    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async getEmployeeMonthlyReport(employeeId: number, year: number, month: number): Promise<any> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    
    const query = `
      SELECT 
        date,
        status,
        check_in,
        check_out,
        overtime_hours
      FROM attendance
      WHERE employee_id = $1 AND date BETWEEN $2 AND $3
      ORDER BY date
    `;
    
    const result = await this.pool.query(query, [employeeId, startDate, endDate]);
    
    const summary = {
      employeeId,
      year,
      month,
      totalDays: result.rows.length,
      present: result.rows.filter(r => r.status === 'present').length,
      absent: result.rows.filter(r => r.status === 'absent').length,
      late: result.rows.filter(r => r.status === 'late').length,
      halfDay: result.rows.filter(r => r.status === 'half_day').length,
      totalOvertime: result.rows.reduce((sum, r) => sum + (r.overtime_hours || 0), 0),
      records: result.rows
    };
    
    return summary;
  }
}