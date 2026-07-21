import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ValidationPipe } from "@nestjs/common";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: process.env.PUBLIC_BASE_URL || "http://localhost:5173",
    credentials: true,
  });

  const rootPath = join(__dirname, "..", "..", "web", "dist");
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.use((req: any, res: any, next: any) => {
    const path = req.path as string;
    if (path.startsWith("/api/") || path.includes(".")) return next();
    res.sendFile(join(rootPath, "index.html"));
  });

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
