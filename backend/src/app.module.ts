import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { BibleModule } from './bible/bible.module';
import { DevotionsModule } from './devotions/devotions.module';
import { LearningModule } from './learning/learning.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // The "mysql" driver works with MariaDB too.
        type: 'mysql' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '3306')),
        username: config.get<string>('DB_USER', 'lightyouth'),
        password: config.get<string>('DB_PASS', 'lightyouth'),
        database: config.get<string>('DB_NAME', 'lightyouth'),
        charset: 'utf8mb4',
        autoLoadEntities: true,
        synchronize: config.get<string>('DB_SYNC', 'true') === 'true',
      }),
    }),
    AuthModule,
    UsersModule,
    DevotionsModule,
    LearningModule,
    BibleModule,
  ],
})
export class AppModule {}
