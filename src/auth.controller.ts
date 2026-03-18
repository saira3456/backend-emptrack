import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/admin')
  async adminLogin(@Body() body: { email: string; password: string }) {
    const result = await this.authService.adminLogin(body.email, body.password);
    if (!result) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    return result;
  }

  @Post('login/employee')
  async employeeLogin(@Body() body: { email: string; password: string }) {
    const result = await this.authService.employeeLogin(body.email, body.password);
    if (!result) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return result;
  }

  // Unified login endpoint (detects if admin or employee)
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    // First try admin login
    const adminResult = await this.authService.adminLogin(body.email, body.password);
    if (adminResult) {
      return adminResult;
    }

    // Then try employee login
    const employeeResult = await this.authService.employeeLogin(body.email, body.password);
    if (employeeResult) {
      return employeeResult;
    }

    // If both fail
    throw new UnauthorizedException('Invalid credentials');
  }
}