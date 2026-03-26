import { Controller, Get, Post, Put, Body, Query, Param, ParseIntPipe } from '@nestjs/common';
import { AttendanceService } from '../services/attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // GET /attendance?date=2024-01-01
  @Get()
  async getAttendanceByDate(@Query('date') date: string) {
    try {
      const result = await this.attendanceService.getAttendanceByDate(date);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // POST /attendance
  @Post()
  async markAttendance(@Body() body: {
    employeeId: number;
    date: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
  }) {
    try {
      const result = await this.attendanceService.markAttendance(body);
      return {
        success: true,
        message: 'Attendance marked successfully',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // POST /attendance/bulk
  @Post('bulk')
  async bulkMarkAttendance(@Body() body: {
    date: string;
    status: string;
  }) {
    try {
      const result = await this.attendanceService.bulkMarkAttendance(body.date, body.status);
      return {
        success: true,
        message: `Bulk attendance marked successfully for ${result.length} employees`,
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // GET /attendance/summary?startDate=2024-01-01&endDate=2024-01-31
  @Get('summary')
  async getAttendanceSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('date') date?: string
  ) {
    try {
      // If date is provided, get summary for single date
      if (date) {
        const result = await this.attendanceService.getAttendanceSummary(date);
        return [result];
      }
      // Otherwise get summary for date range
      const result = await this.attendanceService.getAttendanceSummaryRange(startDate, endDate);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // GET /attendance/employee/:employeeId
  @Get('employee/:employeeId')
  async getEmployeeAttendance(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const result = await this.attendanceService.getEmployeeAttendance(
        employeeId,
        startDate,
        endDate,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  // PUT /attendance/:id
  @Put(':id')
  async updateAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    try {
      const result = await this.attendanceService.updateAttendance(id, body);
      return {
        success: true,
        message: 'Attendance updated successfully',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // PUT /attendance/check-in-out
  @Put('check-in-out')
  async updateCheckInOut(
    @Body() body: {
      employeeId: number;
      date: string;
      checkIn?: string;
      checkOut?: string;
      overtimeHours?: number;
    },
  ) {
    try {
      const result = await this.attendanceService.updateCheckInOut(
        body.employeeId,
        body.date,
        {
          checkIn: body.checkIn,
          checkOut: body.checkOut,
          overtimeHours: body.overtimeHours,
        },
      );
      return {
        success: true,
        message: 'Check in/out updated successfully',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }
}