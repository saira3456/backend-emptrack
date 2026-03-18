import { Controller, Post, Body, Get, Param, Delete, HttpException, HttpStatus, Put } from '@nestjs/common';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { Employee } from '../types/employee.types';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    try {
      return await this.employeeService.createEmployee(createEmployeeDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create employee',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  @Get()
  async getAllEmployees() {
    try {
      return await this.employeeService.getAllEmployees();
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch employees',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async getEmployeeById(@Param('id') id: string) {
    try {
      const employee = await this.employeeService.getEmployeeById(id);
      if (!employee) {
        throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
      }
      return employee;
    } catch (error) {
      console.error('Error in getEmployeeById controller:', error);
      throw new HttpException(
        error.message || 'Failed to fetch employee',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


@Put(':id')  
async updateEmployee(
  @Param('id') id: string,
  @Body() updateData: Partial<Employee>  
) {
  try {
    const result = await this.employeeService.updateEmployee(id, updateData);
    return {
      success: true,
      message: `Employee with ID ${id} updated successfully`,
      data: result.updatedEmployee
    };
  } catch (error) {
    console.error('Error in updateEmployee controller:', error);
    throw new HttpException(
      error.message || 'Failed to update employee',
      error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}


  @Delete(':id')
  async deleteEmployee(@Param('id') id: string) {
    try {
      const result = await this.employeeService.deleteEmployee(id);
      return {
        success: true,
        message: `Employee with ID ${id} deleted successfully`,
        data: result
      };
    } catch (error) {
      console.error('Error in deleteEmployee controller:', error);
      throw new HttpException(
        error.message || 'Failed to delete employee',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}