import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { join } from "path";

@Controller()
export class SpaFallbackController {
  @Get("*")
  serve(@Req() req: Request, @Res() res: Response) {
    // Let API requests hit their own controllers
    if (req.path.startsWith("/api/")) return;
    // Let static files be served by ServeStaticModule
    if (req.path.includes(".")) return;
    // Everything else → index.html (SPA takes over)
    res.sendFile(join(__dirname, "..", "..", "web", "dist", "index.html"));
  }
}
