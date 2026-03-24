// backend/src/attendance/controllers/attendance.controller.ts
import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { AttendanceService } from '../services/attendance.service';
import { CreateAttendanceDto, UpdateAttendanceDto } from '../dto/create-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  async getAttendance(@Query('date') date: string) {
    return this.attendanceService.getAttendanceByDate(date);
  }

  @Get('summary')
  async getSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.attendanceService.getAttendanceSummary(startDate, endDate);
  }

  @Get('employee/:employeeId')
  async getEmployeeMonthlyReport(
    @Param('employeeId') employeeId: number,
    @Query('year') year: number,
    @Query('month') month: number
  ) {
    return this.attendanceService.getEmployeeMonthlyReport(employeeId, year, month);
  }

  @Post()
  async markAttendance(@Body() createDto: CreateAttendanceDto) {
    return this.attendanceService.markAttendance(createDto);
  }

  @Post('bulk')
  async bulkMarkAttendance(
    @Body() body: { date: string; status: string }
  ) {
    return this.attendanceService.bulkMarkAttendance(body.date, body.status);
  }

  @Put(':id')
  async updateAttendance(
    @Param('id') id: number,
    @Body() updateDto: UpdateAttendanceDto
  ) {
    return this.attendanceService.updateAttendance(id, updateDto);
  }
}