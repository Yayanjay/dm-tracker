import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { join } from "path";

@Injectable()
export class SpaFallbackMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.path.startsWith("/api/") || req.path.includes(".")) {
      return next();
    }
    res.sendFile(join(__dirname, "..", "..", "web", "dist", "index.html"));
  }
}
