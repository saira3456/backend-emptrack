import { Controller, Get, Post, Body } from '@nestjs/common';
import { pool } from './db';


@Controller()
export class AppController {

  @Get()
  getHello(): string {
    return 'Hello World!';
  }

  @Get('test-db')
  async testDb() {
    const result = await pool.query('SELECT NOW()');
    return result.rows;
  }

}