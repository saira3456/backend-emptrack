import { Controller, Post, Body, Get, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { DepartmentService } from '../services/department.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';

@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  async create(@Body() createDepartmentDto: CreateDepartmentDto) {
    try {
      return await this.departmentService.createDepartment(createDepartmentDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create department',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  async getAllDepartments() {
    try {
      return await this.departmentService.getAllDepartments();
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch departments',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async getDepartmentById(@Param('id') id: string) {
    try {
      return await this.departmentService.getDepartmentById(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch department',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  async deleteDepartment(@Param('id') id: string) {
    try {
      const result = await this.departmentService.deleteDepartment(id);
      return {
        success: true,
        message: `Department with ID ${id} deleted successfully`,
        data: result
      };
    } catch (error) {
      console.error('Error in deleteDepartment controller:', error);
      throw new HttpException(
        error.message || 'Failed to delete department',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}