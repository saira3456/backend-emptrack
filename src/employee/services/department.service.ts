import { Injectable } from '@nestjs/common';
import { pool } from '../../db';

@Injectable()
export class DepartmentService {

  // Create department
  async createDepartment(data: any) {
    try {
      const query = `
        INSERT INTO departments
        (name, description, manager_id, budget, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name, description, manager_id, budget, created_at
      `;

      const values = [
        data.name,
        data.description,
        data.managerId || null,
        data.budget,
      ];

      const result = await pool.query(query, values);
      const dept = result.rows[0];

      // Get manager name if exists
      let managerName = null;
      if (dept.manager_id) {
        const managerResult = await pool.query('SELECT name FROM employees WHERE id = $1', [dept.manager_id]);
        managerName = managerResult.rows[0]?.name;
      }

      // Get employee count
      const countResult = await pool.query('SELECT COUNT(*) as count FROM employees WHERE department_id = $1', [dept.id]);

      return {
        id: dept.id.toString(),
        name: dept.name,
        description: dept.description,
        managerId: dept.manager_id,
        manager: managerName,
        employeeCount: parseInt(countResult.rows[0].count),
        budget: parseFloat(dept.budget),
        createdAt: dept.created_at,
      };
    } catch (error) {
      console.error('Database error in createDepartment:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Get all departments with employee counts
  async getAllDepartments() {
    try {
      const query = `
        SELECT 
          d.id, 
          d.name, 
          d.description, 
          d.manager_id,
          e.name as manager_name,
          d.budget,
          d.created_at,
          d.updated_at,
          COUNT(emp.id) as employee_count
        FROM departments d
        LEFT JOIN employees e ON d.manager_id = e.id
        LEFT JOIN employees emp ON d.id = emp.department_id
        GROUP BY d.id, e.name
        ORDER BY d.id DESC
      `;

      const result = await pool.query(query);

      return result.rows.map(dept => ({
        id: dept.id.toString(),
        name: dept.name,
        description: dept.description,
        managerId: dept.manager_id,
        manager: dept.manager_name,
        employeeCount: parseInt(dept.employee_count),
        budget: parseFloat(dept.budget),
        createdAt: dept.created_at,
        updatedAt: dept.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw new Error(`Failed to fetch departments: ${error.message}`);
    }
  }

  // Get employee by ID
  async getEmployeeById(id: string) {
    try {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new Error(`Invalid employee ID: ${id}`);
      }
      
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
      console.error('Error fetching employee by ID:', error);
      throw error;
    }
  }

  // Get department by ID
  async getDepartmentById(id: string) {
    try {
      const numericId = parseInt(id, 10);
      
      const query = `
        SELECT 
          d.id, 
          d.name, 
          d.description, 
          d.manager_id,
          e.name as manager_name,
          d.budget,
          d.created_at,
          d.updated_at,
          COUNT(emp.id) as employee_count
        FROM departments d
        LEFT JOIN employees e ON d.manager_id = e.id
        LEFT JOIN employees emp ON d.id = emp.department_id
        WHERE d.id = $1
        GROUP BY d.id, e.name
      `;

      const result = await pool.query(query, [numericId]);
      
      if (result.rowCount === 0) {
        throw new Error(`Department with ID ${id} not found`);
      }

      const dept = result.rows[0];
      return {
        id: dept.id.toString(),
        name: dept.name,
        description: dept.description,
        managerId: dept.manager_id,
        manager: dept.manager_name,
        employeeCount: parseInt(dept.employee_count),
        budget: parseFloat(dept.budget),
        createdAt: dept.created_at,
        updatedAt: dept.updated_at,
      };
    } catch (error) {
      console.error('Error fetching department:', error);
      throw error;
    }
  }

  // Delete department
  async deleteDepartment(id: string) {
    try {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new Error(`Invalid department ID: ${id}`);
      }

      // Check if department has employees
      const empCheck = await pool.query('SELECT COUNT(*) as count FROM employees WHERE department_id = $1', [numericId]);
      if (parseInt(empCheck.rows[0].count) > 0) {
        throw new Error(`Cannot delete department with existing employees. Please reassign employees first.`);
      }

      const checkQuery = `SELECT id, name FROM departments WHERE id = $1`;
      const checkResult = await pool.query(checkQuery, [numericId]);

      if (checkResult.rowCount === 0) {
        throw new Error(`Department with ID ${id} not found`);
      }

      const deleteQuery = `DELETE FROM departments WHERE id = $1 RETURNING id, name`;
      const deleteResult = await pool.query(deleteQuery, [numericId]);

      return {
        success: true,
        deletedDepartment: deleteResult.rows[0]
      };
    } catch (error) {
      console.error('Error deleting department:', error);
      throw new Error(`Failed to delete department: ${error.message}`);
    }
  }
}