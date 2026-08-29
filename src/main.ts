import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // `whitelist` strips properties the DTO does not declare. It only works
  // because every DTO here carries validation decorators -- a DTO with none
  // is stripped to `{}` and the handler receives nothing, which is exactly how
  // the sibling `ddd` sample's write endpoints returned 500 on every call.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
