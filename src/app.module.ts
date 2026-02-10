import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { DddModule } from '@nestjslatam/ddd-lib';
import { EsModule } from '@nestjslatam/es';

@Module({
  imports: [
    CqrsModule,
    DddModule,
    MongooseModule.forRoot('mongodb://localhost:27017/es-read-db'),
    EsModule.forRoot({
      mongoUrl: 'mongodb://localhost:27017/es-event-store-db',
    }),
    TypeOrmModule.forRoot({
      port: 5432,
      type: 'postgres',
      host: 'localhost',
      password: 'beyondnet',
      username: 'postgres',
      autoLoadEntities: true,
      synchronize: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
