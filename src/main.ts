import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Use FRONTEND_URL for backend, not NEXT_PUBLIC_API_URL
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001', 
    credentials: true,
  });
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log(`🚀 Backend running on: http://localhost:${port}`);
  console.log(`🔒 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
}
bootstrap();