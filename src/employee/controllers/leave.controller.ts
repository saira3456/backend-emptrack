import { Controller, Post, Body, Get, Param, Put, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { LeaveService } from '../services/leave.service';
import { CreateLeaveDto, UpdateLeaveStatusDto } from '../dto/create-leave.dto';

@Controller('leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  async create(@Body() createLeaveDto: CreateLeaveDto) {
    try {
      return await this.leaveService.createLeave(createLeaveDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create leave request',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  async getAllLeaves() {
    try {
      return await this.leaveService.getAllLeaves();
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch leaves',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('employee/:employeeId')
  async getEmployeeLeaves(@Param('employeeId') employeeId: string) {
    try {
      return await this.leaveService.getEmployeeLeaves(employeeId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch employee leaves',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async getLeaveById(@Param('id') id: string) {
    try {
      const leave = await this.leaveService.getLeaveById(id);
      if (!leave) {
        throw new HttpException('Leave request not found', HttpStatus.NOT_FOUND);
      }
      return leave;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch leave',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id/status')
  async updateLeaveStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateLeaveStatusDto
  ) {
    try {
      return await this.leaveService.updateLeaveStatus(id, updateStatusDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update leave status',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  async deleteLeave(@Param('id') id: string) {
    try {
      const result = await this.leaveService.deleteLeave(id);
      return {
        success: true,
        message: `Leave request with ID ${id} deleted successfully`,
        data: result
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete leave',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}