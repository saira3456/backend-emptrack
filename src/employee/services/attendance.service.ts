import { Injectable } from '@nestjs/common';
import { pool } from '../../db';

@Injectable()
export class AttendanceService {

  async getAttendanceByDate(date: string) {
    try {
      console.log('Fetching attendance for date:', date);
      
      const query = `
        SELECT 
          e.id as employee_id,
          e.name,
          e.email,
          e.position,
          d.name as department_name,
          a.id as attendance_id,
          a.status,
          a.check_in,
          a.check_out,
          a.overtime_hours,
          a.date
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1::DATE
        WHERE e.status = 'active'
        ORDER BY e.name
      `;
      
      const result = await pool.query(query, [date]);
      console.log(`Found ${result.rows.length} employee records`);
      
      return result.rows.map(row => ({
        employee: {
          id: row.employee_id,
          name: row.name,
          email: row.email,
          position: row.position,
          department: row.department_name || 'Unknown',
        },
        attendance: row.status ? {
          id: row.attendance_id,
          status: row.status,
          checkIn: row.check_in,
          checkOut: row.check_out,
          overtimeHours: parseFloat(row.overtime_hours) || 0,
          date: row.date,
        } : null,
      }));
    } catch (error) {
      console.error('Error fetching attendance by date:', error);
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }
  }

  async markAttendance(data: {
    employeeId: number;
    date: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
  }) {
    console.log('Marking attendance with data:', { ...data });
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // First check if employee exists
      const employeeCheck = await client.query(
        'SELECT id FROM employees WHERE id = $1 AND status = $2',
        [data.employeeId, 'active']
      );
      
      if (employeeCheck.rows.length === 0) {
        throw new Error(`Employee with ID ${data.employeeId} not found or not active`);
      }
      
      // Check if attendance already exists
      const checkQuery = `
        SELECT id, check_in FROM attendance 
        WHERE employee_id = $1 AND date = $2::DATE
      `;
      
      const existing = await client.query(checkQuery, [data.employeeId, data.date]);
      console.log('Existing attendance:', existing.rows[0]);
      
      let result;
      
      if (existing.rows.length > 0) {
        // Update existing attendance
        const updateQuery = `
          UPDATE attendance 
          SET status = $1
          WHERE employee_id = $2 AND date = $3::DATE
          RETURNING id, employee_id, date, status, check_in, check_out, overtime_hours
        `;
        
        result = await client.query(updateQuery, [
          data.status,
          data.employeeId,
          data.date
        ]);
        
        console.log('Updated existing attendance:', result.rows[0]);
      } else {
        // Insert new attendance
        let checkInValue: Date | null = null;
        if (data.status === 'present') {
          checkInValue = new Date();
        }
        
        const insertQuery = `
          INSERT INTO attendance (
            employee_id, 
            date, 
            status, 
            check_in,
            overtime_hours
          )
          VALUES ($1, $2::DATE, $3, $4, $5)
          RETURNING id, employee_id, date, status, check_in, check_out, overtime_hours
        `;
        
        result = await client.query(insertQuery, [
          data.employeeId,
          data.date,
          data.status,
          checkInValue,
          0
        ]);
        
        console.log('Inserted new attendance:', result.rows[0]);
      }
      
      await client.query('COMMIT');
      
      const attendance = result.rows[0];
      
      return {
        id: attendance.id,
        employeeId: attendance.employee_id,
        date: attendance.date,
        status: attendance.status,
        checkIn: attendance.check_in,
        checkOut: attendance.check_out,
        overtimeHours: parseFloat(attendance.overtime_hours) || 0,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error marking attendance:', error);
      throw new Error(`Failed to mark attendance: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async bulkMarkAttendance(date: string, status: string) {
    console.log('Bulk marking attendance:', { date, status });
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      let checkInValue: Date | null = null;
      if (status === 'present') {
        checkInValue = new Date();
      }
      
      const query = `
        INSERT INTO attendance (employee_id, date, status, check_in, overtime_hours)
        SELECT 
          e.id, 
          $1::DATE, 
          $2,
          $3,
          0
        FROM employees e
        WHERE e.status = 'active'
        ON CONFLICT (employee_id, date) 
        DO UPDATE SET 
          status = EXCLUDED.status
        RETURNING id, employee_id, date, status, check_in, check_out, overtime_hours
      `;
      
      const result = await client.query(query, [date, status, checkInValue]);
      console.log(`Bulk marked ${result.rows.length} employees`);
      
      await client.query('COMMIT');
      
      return result.rows.map(row => ({
        id: row.id,
        employeeId: row.employee_id,
        date: row.date,
        status: row.status,
        checkIn: row.check_in,
        checkOut: row.check_out,
        overtimeHours: parseFloat(row.overtime_hours) || 0,
      }));
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error bulk marking attendance:', error);
      throw new Error(`Failed to bulk mark attendance: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async getAttendanceSummary(date: string) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT e.id) as total_employees,
          COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
          COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
          COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
          COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_day,
          COUNT(CASE WHEN a.status IS NULL THEN 1 END) as not_marked,
          ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / NULLIF(COUNT(DISTINCT e.id), 0) * 100, 2) as attendance_rate
        FROM employees e
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1::DATE
        WHERE e.status = 'active'
      `;
      
      const result = await pool.query(query, [date]);
      
      const summary = result.rows[0];
      
      return {
        date,
        totalEmployees: parseInt(summary.total_employees),
        present: parseInt(summary.present),
        absent: parseInt(summary.absent),
        late: parseInt(summary.late),
        halfDay: parseInt(summary.half_day),
        notMarked: parseInt(summary.not_marked),
        attendanceRate: parseFloat(summary.attendance_rate) || 0,
      };
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      throw new Error(`Failed to fetch attendance summary: ${error.message}`);
    }
  }

  async getAttendanceSummaryRange(startDate: string, endDate: string) {
    try {
      const query = `
        SELECT 
          a.date,
          COUNT(DISTINCT e.id) as total_employees,
          COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
          COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
          COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
          COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_day,
          COUNT(CASE WHEN a.status IS NULL THEN 1 END) as not_marked,
          ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / NULLIF(COUNT(DISTINCT e.id), 0) * 100, 2) as attendance_rate
        FROM employees e
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.date BETWEEN $1::DATE AND $2::DATE
        WHERE e.status = 'active'
        GROUP BY a.date
        ORDER BY a.date
      `;
      
      const result = await pool.query(query, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching attendance summary range:', error);
      throw new Error(`Failed to fetch attendance summary range: ${error.message}`);
    }
  }

  async getEmployeeAttendance(employeeId: number, startDate?: string, endDate?: string) {
    try {
      let query = `
        SELECT 
          id,
          employee_id,
          date,
          status,
          check_in,
          check_out,
          overtime_hours
        FROM attendance 
        WHERE employee_id = $1
      `;
      
      const params: any[] = [employeeId];
      let paramIndex = 2;
      
      if (startDate) {
        query += ` AND date >= $${paramIndex}::DATE`;
        params.push(startDate);
        paramIndex++;
        
        if (endDate) {
          query += ` AND date <= $${paramIndex}::DATE`;
          params.push(endDate);
          paramIndex++;
        }
      }
      
      query += ` ORDER BY date DESC`;
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        employeeId: row.employee_id,
        date: row.date,
        status: row.status,
        checkIn: row.check_in,
        checkOut: row.check_out,
        overtimeHours: parseFloat(row.overtime_hours) || 0,
      }));
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      throw new Error(`Failed to fetch employee attendance: ${error.message}`);
    }
  }

  async updateAttendance(id: number, data: any) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;
      
      if (data.status) {
        updates.push(`status = $${paramCounter}`);
        values.push(data.status);
        paramCounter++;
      }
      
      if (data.checkIn !== undefined) {
        updates.push(`check_in = $${paramCounter}`);
        values.push(data.checkIn);
        paramCounter++;
      }
      
      if (data.checkOut !== undefined) {
        updates.push(`check_out = $${paramCounter}`);
        values.push(data.checkOut);
        paramCounter++;
      }
      
      if (data.overtimeHours !== undefined) {
        updates.push(`overtime_hours = $${paramCounter}`);
        values.push(data.overtimeHours);
        paramCounter++;
      }
      
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      
      values.push(id);
      
      const query = `
        UPDATE attendance 
        SET ${updates.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        throw new Error('Attendance record not found');
      }
      
      const attendance = result.rows[0];
      
      return {
        id: attendance.id,
        employeeId: attendance.employee_id,
        date: attendance.date,
        status: attendance.status,
        checkIn: attendance.check_in,
        checkOut: attendance.check_out,
        overtimeHours: parseFloat(attendance.overtime_hours) || 0,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating attendance:', error);
      throw new Error(`Failed to update attendance: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async updateCheckInOut(
    employeeId: number, 
    date: string, 
    data: { checkIn?: string; checkOut?: string; overtimeHours?: number }
  ) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;
      
      if (data.checkIn) {
        updates.push(`check_in = $${paramCounter}`);
        values.push(data.checkIn);
        paramCounter++;
      }
      
      if (data.checkOut) {
        updates.push(`check_out = $${paramCounter}`);
        values.push(data.checkOut);
        paramCounter++;
      }
      
      if (data.overtimeHours !== undefined) {
        updates.push(`overtime_hours = $${paramCounter}`);
        values.push(data.overtimeHours);
        paramCounter++;
      }
      
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      
      values.push(employeeId, date);
      
      const query = `
        UPDATE attendance 
        SET ${updates.join(', ')}
        WHERE employee_id = $${paramCounter} AND date = $${paramCounter + 1}::DATE
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        throw new Error('Attendance record not found');
      }
      
      const attendance = result.rows[0];
      
      return {
        id: attendance.id,
        employeeId: attendance.employee_id,
        date: attendance.date,
        status: attendance.status,
        checkIn: attendance.check_in,
        checkOut: attendance.check_out,
        overtimeHours: parseFloat(attendance.overtime_hours) || 0,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating check in/out:', error);
      throw new Error(`Failed to update check in/out: ${error.message}`);
    } finally {
      client.release();
    }
  }
}