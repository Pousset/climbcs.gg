import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { loadEnv } from './config/env';

async function main(): Promise<void> {
  const config = loadEnv(process.env);
  // The adapter is passed explicitly so it never depends on how npm hoists the package.
  const app = await NestFactory.create(AppModule.forRoot(config), new ExpressAdapter());
  configureApp(app, config);
  await app.listen(config.port);
  new Logger('Bootstrap').log(`API listening on port ${config.port}`);
}

void main();
