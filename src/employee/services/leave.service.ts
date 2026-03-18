import { Injectable } from '@nestjs/common';
import { pool } from '../../db';

@Injectable()
export class LeaveService {

  // Create leave request
  async createLeave(data: any) {
    try {
      console.log('Creating leave request with data:', data);

      // Check if employee exists
      const empCheck = await pool.query('SELECT id, name FROM employees WHERE id = $1', [data.employeeId]);
      if (empCheck.rowCount === 0) {
        throw new Error(`Employee with ID ${data.employeeId} not found`);
      }

      // Calculate number of days
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const query = `
        INSERT INTO leave_requests
        (employee_id, type, start_date, end_date, days, reason, status, applied_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, employee_id, type, start_date, end_date, days, reason, status, applied_date, created_at
      `;

      const values = [
        data.employeeId,
        data.type,
        data.startDate,
        data.endDate,
        days,
        data.reason
      ];

      const result = await pool.query(query, values);
      const leave = result.rows[0];

      // Get employee name
      const employee = empCheck.rows[0];

      return {
        id: leave.id.toString(),
        employeeId: leave.employee_id.toString(),
        employeeName: employee.name,
        type: leave.type,
        startDate: leave.start_date,
        endDate: leave.end_date,
        days: leave.days,
        reason: leave.reason,
        status: leave.status,
        appliedDate: leave.applied_date,
        createdAt: leave.created_at,
      };
    } catch (error) {
      console.error('Database error in createLeave:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Get all leave requests
  async getAllLeaves() {
    try {
      console.log('🔍 Fetching all leave requests...');

      const query = `
        SELECT 
          l.id, 
          l.employee_id,
          e.name as employee_name,
          l.type, 
          l.start_date, 
          l.end_date, 
          l.days,
          l.reason, 
          l.status,
          l.applied_date,
          l.approved_by,
          a.name as approver_name,
          l.created_at,
          l.updated_at
        FROM leave_requests l
        LEFT JOIN employees e ON l.employee_id = e.id
        LEFT JOIN employees a ON l.approved_by = a.id
        ORDER BY l.applied_date DESC, l.id DESC
      `;

      const result = await pool.query(query);
      console.log(`✅ Found ${result.rowCount} leave requests`);

      return result.rows.map(leave => ({
        id: leave.id.toString(),
        employeeId: leave.employee_id?.toString(),
        employeeName: leave.employee_name,
        type: leave.type,
        startDate: leave.start_date,
        endDate: leave.end_date,
        days: leave.days,
        reason: leave.reason,
        status: leave.status,
        appliedDate: leave.applied_date,
        approvedBy: leave.approved_by?.toString(),
        approverName: leave.approver_name,
        createdAt: leave.created_at,
        updatedAt: leave.updated_at,
      }));
    } catch (error) {
      console.error('❌ Error fetching leaves:', error);
      throw new Error(`Failed to fetch leaves: ${error.message}`);
    }
  }

  // Get employee leaves
  async getEmployeeLeaves(employeeId: string) {
    try {
      const numericId = parseInt(employeeId, 10);
      
      const query = `
        SELECT 
          l.id, 
          l.employee_id,
          e.name as employee_name,
          l.type, 
          l.start_date, 
          l.end_date, 
          l.days,
          l.reason, 
          l.status,
          l.applied_date,
          l.approved_by,
          a.name as approver_name,
          l.created_at,
          l.updated_at
        FROM leave_requests l
        LEFT JOIN employees e ON l.employee_id = e.id
        LEFT JOIN employees a ON l.approved_by = a.id
        WHERE l.employee_id = $1
        ORDER BY l.applied_date DESC, l.id DESC
      `;

      const result = await pool.query(query, [numericId]);
      
      return result.rows.map(leave => ({
        id: leave.id.toString(),
        employeeId: leave.employee_id?.toString(),
        employeeName: leave.employee_name,
        type: leave.type,
        startDate: leave.start_date,
        endDate: leave.end_date,
        days: leave.days,
        reason: leave.reason,
        status: leave.status,
        appliedDate: leave.applied_date,
        approvedBy: leave.approved_by?.toString(),
        approverName: leave.approver_name,
        createdAt: leave.created_at,
        updatedAt: leave.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching employee leaves:', error);
      throw error;
    }
  }

  // Get leave by ID
  async getLeaveById(id: string) {
    try {
      const numericId = parseInt(id, 10);
      
      const query = `
        SELECT 
          l.id, 
          l.employee_id,
          e.name as employee_name,
          l.type, 
          l.start_date, 
          l.end_date, 
          l.days,
          l.reason, 
          l.status,
          l.applied_date,
          l.approved_by,
          a.name as approver_name,
          l.created_at,
          l.updated_at
        FROM leave_requests l
        LEFT JOIN employees e ON l.employee_id = e.id
        LEFT JOIN employees a ON l.approved_by = a.id
        WHERE l.id = $1
      `;

      const result = await pool.query(query, [numericId]);
      
      if (result.rowCount === 0) {
        throw new Error(`Leave request with ID ${id} not found`);
      }

      const leave = result.rows[0];
      return {
        id: leave.id.toString(),
        employeeId: leave.employee_id?.toString(),
        employeeName: leave.employee_name,
        type: leave.type,
        startDate: leave.start_date,
        endDate: leave.end_date,
        days: leave.days,
        reason: leave.reason,
        status: leave.status,
        appliedDate: leave.applied_date,
        approvedBy: leave.approved_by?.toString(),
        approverName: leave.approver_name,
        createdAt: leave.created_at,
        updatedAt: leave.updated_at,
      };
    } catch (error) {
      console.error('Error fetching leave:', error);
      throw error;
    }
  }

  // Update leave status
  async updateLeaveStatus(id: string, data: any) {
    try {
      const numericId = parseInt(id, 10);
      
      // Check if leave exists
      const checkQuery = `SELECT id FROM leave_requests WHERE id = $1`;
      const checkResult = await pool.query(checkQuery, [numericId]);
      
      if (checkResult.rowCount === 0) {
        throw new Error(`Leave request with ID ${id} not found`);
      }

      const query = `
        UPDATE leave_requests
        SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, employee_id, type, start_date, end_date, days, reason, status, applied_date, approved_by
      `;

      const values = [
        data.status,
        data.approvedBy || null,
        numericId
      ];

      const result = await pool.query(query, values);
      const leave = result.rows[0];

      return {
        id: leave.id.toString(),
        employeeId: leave.employee_id.toString(),
        type: leave.type,
        startDate: leave.start_date,
        endDate: leave.end_date,
        days: leave.days,
        reason: leave.reason,
        status: leave.status,
        appliedDate: leave.applied_date,
        approvedBy: leave.approved_by?.toString(),
      };
    } catch (error) {
      console.error('Error updating leave status:', error);
      throw error;
    }
  }

  // Delete leave request
  async deleteLeave(id: string) {
    try {
      const numericId = parseInt(id, 10);
      
      const checkQuery = `SELECT id FROM leave_requests WHERE id = $1`;
      const checkResult = await pool.query(checkQuery, [numericId]);

      if (checkResult.rowCount === 0) {
        throw new Error(`Leave request with ID ${id} not found`);
      }

      const deleteQuery = `DELETE FROM leave_requests WHERE id = $1 RETURNING id`;
      const deleteResult = await pool.query(deleteQuery, [numericId]);

      return {
        success: true,
        deletedId: deleteResult.rows[0].id.toString()
      };
    } catch (error) {
      console.error('Error deleting leave:', error);
      throw error;
    }
  }
}