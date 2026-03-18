import { Injectable } from '@nestjs/common';
import { pool } from '../../db';
import * as bcrypt from 'bcrypt';
import { Employee } from '../types/employee.types';

@Injectable()
export class EmployeeService {

  // Create employee
  async createEmployee(data: any) {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Check if department exists
      const deptCheck = await pool.query('SELECT id FROM departments WHERE id = $1', [data.departmentId]);
      if (deptCheck.rowCount === 0) {
        throw new Error(`Department with ID ${data.departmentId} not found`);
      }

      const query = `
        INSERT INTO employees
        (name, email, phone, position, department_id, salary, join_date, status, password, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name, email, phone, position, department_id, salary, join_date, status, created_at, updated_at
      `;

      const values = [
        data.name,
        data.email,
        data.phone,
        data.position,
        data.departmentId,
        data.salary,
        data.joinDate,
        data.status,
        hashedPassword,
      ];

      const result = await pool.query(query, values);
      const employee = result.rows[0];

      // Get department name
      const deptResult = await pool.query('SELECT name FROM departments WHERE id = $1', [employee.department_id]);

      return {
        id: employee.id.toString(),
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        departmentId: employee.department_id,
        department: deptResult.rows[0]?.name,
        salary: parseFloat(employee.salary),
        joinDate: employee.join_date,
        status: employee.status,
        createdAt: employee.created_at,
        updatedAt: employee.updated_at,
      };
    } catch (error) {
      console.error('Database error in createEmployee:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Validate employee for login
  async validateEmployee(email: string, password: string): Promise<any> {
    try {
      const query = `
        SELECT e.*, d.name as department_name 
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.email = $1
      `;
      const result = await pool.query(query, [email]);

      const employee = result.rows[0];

      if (!employee) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, employee.password);

      if (!isPasswordValid) {
        return null;
      }

      // Return employee without password
      const { password: _, ...employeeWithoutPassword } = employee;
      return {
        ...employeeWithoutPassword,
        id: employeeWithoutPassword.id.toString(),
        department: employeeWithoutPassword.department_name,
      };
    } catch (error) {
      console.error('Error validating employee:', error);
      throw error;
    }
  }

  // Get all employees
  async getAllEmployees() {
    try {
      const query = `
        SELECT 
          e.id, 
          e.name, 
          e.email, 
          e.phone, 
          e.position, 
          e.department_id,
          d.name as department_name,
          e.salary, 
          e.join_date, 
          e.status,
          e.created_at,
          e.updated_at
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        ORDER BY e.id DESC
      `;

      const result = await pool.query(query);

      return result.rows.map(emp => ({
        id: emp.id.toString(),
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        departmentId: emp.department_id,
        department: emp.department_name,
        salary: parseFloat(emp.salary),
        joinDate: emp.join_date,
        status: emp.status,
        createdAt: emp.created_at,
        updatedAt: emp.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw new Error(`Failed to fetch employees: ${error.message}`);
    }
  }

  // Get employee by ID
  async getEmployeeById(id: string) {
    try {
      const numericId = parseInt(id, 10);
      
      const query = `
        SELECT 
          e.id, 
          e.name, 
          e.email, 
          e.phone, 
          e.position, 
          e.department_id,
          d.name as department_name,
          e.salary, 
          e.join_date, 
          e.status,
          e.created_at,
          e.updated_at
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.id = $1
      `;

      const result = await pool.query(query, [numericId]);
      
      if (result.rowCount === 0) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      const emp = result.rows[0];
      return {
        id: emp.id.toString(),
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        departmentId: emp.department_id,
        department: emp.department_name,
        salary: parseFloat(emp.salary),
        joinDate: emp.join_date,
        status: emp.status,
        createdAt: emp.created_at,
        updatedAt: emp.updated_at,
      };
    } catch (error) {
      console.error('Error fetching employee:', error);
      throw error;
    }
  }

  // Update employee
  async updateEmployee(id: string, updateData: any) {
    try {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new Error(`Invalid employee ID: ${id}`);
      }

      // Check if employee exists
      const checkQuery = `SELECT * FROM employees WHERE id = $1`;
      const checkResult = await pool.query(checkQuery, [numericId]);

      if (checkResult.rowCount === 0) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      // Build dynamic update query based on provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(updateData.name);
        paramIndex++;
      }
      
      if (updateData.email !== undefined) {
        updates.push(`email = $${paramIndex}`);
        values.push(updateData.email);
        paramIndex++;
      }
      
      if (updateData.phone !== undefined) {
        updates.push(`phone = $${paramIndex}`);
        values.push(updateData.phone);
        paramIndex++;
      }
      
      if (updateData.position !== undefined) {
        updates.push(`position = $${paramIndex}`);
        values.push(updateData.position);
        paramIndex++;
      }
      
      const departmentId = updateData.department_id !== undefined ? updateData.department_id : updateData.departmentId;
      if (departmentId !== undefined) {
        updates.push(`department_id = $${paramIndex}`);
        values.push(departmentId);
        paramIndex++;
      }
      
      if (updateData.salary !== undefined) {
        updates.push(`salary = $${paramIndex}`);
        values.push(updateData.salary);
        paramIndex++;
      }
      
      if (updateData.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(updateData.status);
        paramIndex++;
      }
      
      const joinDate = updateData.join_date !== undefined ? updateData.join_date : updateData.joinDate;
      if (joinDate !== undefined) {
        updates.push(`join_date = $${paramIndex}`);
        values.push(joinDate);
        paramIndex++;
      }

      if (updates.length === 0) {
        const currentData = await this.getEmployeeById(id);
        return {
          success: true,
          message: 'No fields to update',
          updatedEmployee: currentData
        };
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(numericId);

      const updateQuery = `
        UPDATE employees 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} 
        RETURNING id, name, email, phone, position, department_id, salary, status, join_date, created_at, updated_at
      `;

      const updateResult = await pool.query(updateQuery, values);

      if (updateResult.rowCount === 0) {
        throw new Error(`Update failed for employee ID ${id}`);
      }

      const deptResult = await pool.query(
        'SELECT name FROM departments WHERE id = $1', 
        [updateResult.rows[0].department_id]
      );

      const updated = updateResult.rows[0];
      
      return {
        success: true,
        updatedEmployee: {
          id: updated.id.toString(),
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          position: updated.position,
          departmentId: updated.department_id,
          department: deptResult.rows[0]?.name || '',
          salary: parseFloat(updated.salary),
          joinDate: updated.join_date,
          status: updated.status,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        }
      };
    } catch (error) {
      console.error('Error updating employee:', error);
      throw new Error(`Failed to update employee: ${error.message}`);
    }
  }

  // Delete employee
  async deleteEmployee(id: string) {
    try {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new Error(`Invalid employee ID: ${id}`);
      }

      const checkQuery = `SELECT id, name, email FROM employees WHERE id = $1`;
      const checkResult = await pool.query(checkQuery, [numericId]);

      if (checkResult.rowCount === 0) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      const deleteQuery = `DELETE FROM employees WHERE id = $1 RETURNING id, name, email`;
      const deleteResult = await pool.query(deleteQuery, [numericId]);

      return {
        success: true,
        deletedEmployee: deleteResult.rows[0]
      };
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw new Error(`Failed to delete employee: ${error.message}`);
    }
  }
}