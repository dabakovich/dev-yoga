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
  // Bind to HOST so the server is reachable beyond `localhost`. Default
  // `0.0.0.0` listens on all interfaces, exposing it on the Mac's LAN IP so a
  // phone on the same Wi-Fi can hit it (the mobile app points at that IP).
  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}
bootstrap();
