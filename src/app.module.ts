import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EsModule } from '@nestjslatam/es';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BankAccountModule } from './bank-account/bank-account.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/es-event-store-db',
      }),
      inject: [ConfigService],
    }),
    EsModule.forRoot({
      driver: 'mongo',
      mongoUrl: process.env.EVENT_STORE_URL || 'mongodb://localhost:27017/event-store',
    }),
    BankAccountModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
