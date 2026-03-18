import { Controller, Post, Body, Get, Param, Put, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { ProjectService } from '../services/project.service';
import { CreateProjectDto, AssignEmployeeDto } from '../dto/create-project.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto) {
    try {
      return await this.projectService.createProject(createProjectDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create project',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  async getAllProjects() {
    try {
      return await this.projectService.getAllProjects();
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch projects',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async getProjectById(@Param('id') id: string) {
    try {
      const project = await this.projectService.getProjectById(id);
      if (!project) {
        throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
      }
      return project;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch project',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ========== NEW ENDPOINT: Get project team ==========
  @Get(':id/team')
  async getProjectTeam(@Param('id') id: string) {
    try {
      return await this.projectService.getProjectTeam(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch project team',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/assign')
  async assignEmployee(
    @Param('id') id: string,
    @Body() assignDto: AssignEmployeeDto
  ) {
    try {
      return await this.projectService.assignEmployeeToProject(id, assignDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to assign employee',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':projectId/employee/:employeeId')
  async removeEmployee(
    @Param('projectId') projectId: string,
    @Param('employeeId') employeeId: string
  ) {
    try {
      return await this.projectService.removeEmployeeFromProject(projectId, employeeId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to remove employee',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id')
  async updateProject(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateProjectDto>
  ) {
    try {
      return await this.projectService.updateProject(id, updateData);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update project',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ========== NEW ENDPOINT: Get available employees for project ==========
  @Get(':id/available-employees')
  async getAvailableEmployees(@Param('id') id: string) {
    try {
      return await this.projectService.getAvailableEmployeesForProject(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch available employees',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('employee/:employeeId')
  async getEmployeeProjects(@Param('employeeId') employeeId: string) {
    try {
      return await this.projectService.getEmployeeProjects(employeeId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch employee projects',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}