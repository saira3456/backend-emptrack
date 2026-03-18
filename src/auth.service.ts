import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { pool } from './db';

@Injectable()
export class AuthService {
  private readonly adminEmail: string;
  private readonly adminPassword: string;
  private readonly jwtSecret: string;

  constructor(private configService: ConfigService) {
    this.adminEmail = this.configService.get<string>('ADMIN_EMAIL', 'admin@emptrack.com');
    this.adminPassword = this.configService.get<string>('ADMIN_PASSWORD', 'password');
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'your_jwt_secret');
  }

  // Admin login
  async adminLogin(email: string, password: string) {
    if (email === this.adminEmail && password === this.adminPassword) {
      const token = jwt.sign(
        { 
          role: 'admin', 
          email,
          id: 'admin' 
        }, 
        this.jwtSecret, 
        { expiresIn: '1d' }
      );
      return { 
        token, 
        role: 'admin',
        id: 'admin',
        email: this.adminEmail,
        name: 'Administrator'
      };
    }
    return null;
  }

  // Employee login
  async employeeLogin(email: string, password: string) {
    try {
      // Find employee by email with department info
      const result = await pool.query(
        `SELECT e.*, d.name as department_name 
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE e.email = $1`, 
        [email]
      );
      
      const employee = result.rows[0];
      
      if (!employee) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, employee.password);
      
      if (!isPasswordValid) {
        return null;
      }

      const token = jwt.sign(
        { 
          role: 'employee', 
          email: employee.email,
          id: employee.id,
          name: employee.name
        }, 
        this.jwtSecret, 
        { expiresIn: '1d' }
      );

      // Return employee data (excluding password) with token
      const { password: _, ...employeeData } = employee;
      
      return {
        ...employeeData,
        id: employeeData.id.toString(),
        department: employeeData.department_name,
        token,
        role: 'employee'
      };
    } catch (error) {
      console.error('Employee login error:', error);
      return null;
    }
  }

  // Hash password (use when creating new employee)
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }
}