import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateProjectDto, AssignEmployeeDto } from '../dto/create-project.dto';

@Injectable()
export class ProjectService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'emptrack',
    });
  }

  // ========== PROJECT CRUD ==========

  async createProject(createProjectDto: CreateProjectDto) {
    const { name, description, startDate, endDate, status, budget, departmentId } = createProjectDto;
    
    const query = `
      INSERT INTO projects 
      (name, description, start_date, end_date, status, budget, department_id, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, name, description, start_date as "startDate", end_date as "endDate", status, budget, department_id as "departmentId", created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    const result = await this.pool.query(query, [
      name, 
      description, 
      startDate, 
      endDate || null, 
      status || 'planning', 
      budget || 0,
      departmentId || null
    ]);
    
    return result.rows[0];
  }

  async getAllProjects() {
    try {
      const query = `
        SELECT 
          p.id, 
          p.name, 
          p.description, 
          p.start_date as "startDate", 
          p.end_date as "endDate", 
          p.status, 
          p.budget,
          p.department_id as "departmentId",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt",
          d.name as "departmentName",
          COUNT(DISTINCT ep.employee_id) as "teamCount",
          COALESCE(
            AVG(
              CASE 
                WHEN ep.hours_allocated > 0 
                THEN (ep.hours_worked::float / ep.hours_allocated) * 100 
                ELSE 0 
              END
            ), 0
          )::int as "progress"
        FROM projects p
        LEFT JOIN departments d ON p.department_id = d.id
        LEFT JOIN employee_projects ep ON p.id = ep.project_id
        GROUP BY p.id, d.name
        ORDER BY p.created_at DESC
      `;
        
      const result = await this.pool.query(query);
      return result.rows;
      
    } catch (error) {
      console.error('Error fetching projects:', error.message);
      throw error;
    }
  }

  async getProjectById(id: string) {
    const query = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.start_date as "startDate", 
        p.end_date as "endDate", 
        p.status, 
        p.budget,
        p.department_id as "departmentId",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        d.name as "departmentName",
        e.name as "managerName"
      FROM projects p
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN employees e ON d.manager_id = e.id
      WHERE p.id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  async updateProject(id: string, updateData: Partial<CreateProjectDto>) {
    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updateData.description);
    }
    if (updateData.startDate !== undefined) {
      fields.push(`start_date = $${paramIndex++}`);
      values.push(updateData.startDate);
    }
    if (updateData.endDate !== undefined) {
      fields.push(`end_date = $${paramIndex++}`);
      values.push(updateData.endDate);
    }
    if (updateData.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
    }
    if (updateData.budget !== undefined) {
      fields.push(`budget = $${paramIndex++}`);
      values.push(updateData.budget);
    }
    if (updateData.departmentId !== undefined) {
      fields.push(`department_id = $${paramIndex++}`);
      values.push(updateData.departmentId);
    }

    fields.push(`updated_at = NOW()`);

    if (fields.length === 0) {
      return this.getProjectById(id);
    }

    const query = `
      UPDATE projects 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description, start_date as "startDate", end_date as "endDate", status, budget, department_id as "departmentId", created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    values.push(id);
    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  // ========== EMPLOYEE ASSIGNMENTS ==========

  async getProjectTeam(projectId: string) {
    const query = `
      SELECT 
        ep.id,
        ep.employee_id as "employeeId",
        ep.project_id as "projectId",
        ep.role,
        ep.hours_allocated as "hoursAllocated",
        ep.hours_worked as "hoursWorked",
        ep.joined_date as "joinedDate",
        ep.status,
        e.name as "employeeName",
        e.email as "employeeEmail",
        e.position as "employeePosition",
        e.department_id as "employeeDepartmentId",
        d.name as "departmentName"
      FROM employee_projects ep
      JOIN employees e ON ep.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE ep.project_id = $1 AND ep.status = 'active'
      ORDER BY ep.joined_date DESC
    `;
    
    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }

  async assignEmployeeToProject(projectId: string, assignDto: AssignEmployeeDto) {
    const { employeeId, role, hoursAllocated } = assignDto;
    
    // Check if already assigned
    const checkQuery = `
      SELECT id FROM employee_projects 
      WHERE project_id = $1 AND employee_id = $2 AND status = 'active'
    `;
    
    const existing = await this.pool.query(checkQuery, [projectId, employeeId]);
    
    if (existing.rows.length > 0) {
      // Update existing
      const updateQuery = `
        UPDATE employee_projects 
        SET role = $3, hours_allocated = $4, updated_at = NOW()
        WHERE project_id = $1 AND employee_id = $2
        RETURNING id, employee_id as "employeeId", project_id as "projectId", role, hours_allocated as "hoursAllocated", hours_worked as "hoursWorked", joined_date as "joinedDate", status
      `;
      
      const result = await this.pool.query(updateQuery, [projectId, employeeId, role, hoursAllocated]);
      return result.rows[0];
    } else {
      // Insert new
      const insertQuery = `
        INSERT INTO employee_projects 
        (employee_id, project_id, role, hours_allocated, hours_worked, joined_date, status, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, 0, CURRENT_DATE, 'active', NOW(), NOW())
        RETURNING id, employee_id as "employeeId", project_id as "projectId", role, hours_allocated as "hoursAllocated", hours_worked as "hoursWorked", joined_date as "joinedDate", status
      `;
      
      const result = await this.pool.query(insertQuery, [employeeId, projectId, role, hoursAllocated]);
      return result.rows[0];
    }
  }

  async getEmployeeProjects(employeeId: string) {
    const query = `
      SELECT 
        ep.id,
        ep.employee_id as "employeeId",
        ep.project_id as "projectId",
        ep.role,
        ep.hours_allocated as "hoursAllocated",
        ep.hours_worked as "hoursWorked",
        ep.joined_date as "joinedDate",
        ep.status as "assignmentStatus",
        p.id as "projectId",
        p.name as "projectName",
        p.description as "projectDescription",
        p.start_date as "startDate",
        p.end_date as "endDate",
        p.status as "projectStatus",
        p.budget,
        (
          SELECT COUNT(*) 
          FROM employee_projects ep2 
          WHERE ep2.project_id = p.id AND ep2.status = 'active'
        ) as "teamCount",
        (
          SELECT COALESCE(
            AVG(
              CASE 
                WHEN ep3.hours_allocated > 0 
                THEN (ep3.hours_worked::float / ep3.hours_allocated) * 100 
                ELSE 0 
              END
            ), 0
          )::int
          FROM employee_projects ep3
          WHERE ep3.project_id = p.id AND ep3.status = 'active'
        ) as "progress"
      FROM employee_projects ep
      JOIN projects p ON ep.project_id = p.id
      WHERE ep.employee_id = $1 AND ep.status = 'active'
      ORDER BY ep.joined_date DESC
    `;
    
    const result = await this.pool.query(query, [employeeId]);
    return result.rows;
  }

  async removeEmployeeFromProject(projectId: string, employeeId: string) {
    // Soft delete by updating status
    const query = `
      UPDATE employee_projects 
      SET status = 'removed', updated_at = NOW()
      WHERE project_id = $1 AND employee_id = $2 AND status = 'active'
      RETURNING id
    `;
    
    const result = await this.pool.query(query, [projectId, employeeId]);
    
    if (result.rows.length === 0) {
      return { success: false, message: 'Assignment not found' };
    }
    
    return { success: true, message: 'Employee removed from project' };
  }

  async updateWorkHours(projectId: string, employeeId: string, hoursWorked: number) {
    const query = `
      UPDATE employee_projects 
      SET hours_worked = hours_worked + $3, updated_at = NOW()
      WHERE project_id = $1 AND employee_id = $2 AND status = 'active'
      RETURNING hours_worked as "hoursWorked"
    `;
    
    const result = await this.pool.query(query, [projectId, employeeId, hoursWorked]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  async getAvailableEmployeesForProject(projectId: string) {
    const query = `
      SELECT 
        e.id,
        e.name,
        e.email,
        e.position,
        e.department_id as "departmentId",
        d.name as "departmentName"
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'active'
      AND e.id NOT IN (
        SELECT employee_id 
        FROM employee_projects 
        WHERE project_id = $1 AND status = 'active'
      )
      ORDER BY e.name
    `;
    
    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }
}