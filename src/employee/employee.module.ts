import { Module } from '@nestjs/common';
import { EmployeeController } from './controllers/employee.controller';
import { DepartmentController } from './controllers/department.controller';
import { EmployeeService } from './services/employee.service';
import { DepartmentService } from './services/department.service';
import { LeaveController } from './controllers/leave.controller';
import { LeaveService } from './services/leave.service';
import { ProjectService } from './services/project.service';
import { ProjectController } from './controllers/project.controller';

@Module({
  controllers: [EmployeeController, DepartmentController, LeaveController,ProjectController],
  providers: [EmployeeService, DepartmentService,LeaveService, ProjectService],
  exports: [EmployeeService, DepartmentService,LeaveService,ProjectService]
})
export class EmployeeModule { }