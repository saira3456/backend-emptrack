import { Module } from '@nestjs/common';
import { EmployeeController } from './controllers/employee.controller';
import { DepartmentController } from './controllers/department.controller';
import { EmployeeService } from './services/employee.service';
import { DepartmentService } from './services/department.service';
import { LeaveController } from './controllers/leave.controller';
import { LeaveService } from './services/leave.service';
import { ProjectService } from './services/project.service';
import { ProjectController } from './controllers/project.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { AttendanceService } from './services/attendance.service';

@Module({
  controllers: [EmployeeController, DepartmentController, LeaveController,ProjectController, AttendanceController],
  providers: [EmployeeService, DepartmentService,LeaveService, ProjectService, AttendanceService],
  exports: [EmployeeService, DepartmentService,LeaveService,ProjectService, AttendanceService]
})
export class EmployeeModule { }