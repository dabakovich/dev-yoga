import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Validate & sanitize every incoming request body against its DTO before it
  // reaches a controller. `whitelist` strips properties not declared in the
  // DTO; `transform` turns the plain JSON into a typed DTO instance and coerces
  // primitive types (e.g. the string `:id` param into a number when typed so).
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
