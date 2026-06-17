import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { ConversationsModule } from './conversations/conversations.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    // Loads `.env` into the ConfigService. `isGlobal` means we don't have to
    // re-import this module everywhere we want to read config values.
    ConfigModule.forRoot({ isGlobal: true }),
    // Sets up the database connection (TypeORM "DataSource"). We use the async
    // form because the options depend on values resolved at runtime from the
    // ConfigService — Nest injects it into `useFactory` for us.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('DATABASE_PATH', 'data/dev.sqlite'),
        // Picks up every entity registered via `TypeOrmModule.forFeature()`,
        // so we never hand-list entities or use fragile glob paths.
        autoLoadEntities: true,
        // Auto-syncs the schema from entities on boot. Great for dev, unsafe
        // for prod — hence it is gated behind an env flag.
        synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
      }),
    }),
    TasksModule,
    ConversationsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
