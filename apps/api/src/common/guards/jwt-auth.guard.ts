import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Token tidak ditemukan");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request["admin"] = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Token tidak valid atau sudah kedaluwarsa");
    }
  }

  private extractToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.split(" ")[1];
    }

    if (request.cookies && request.cookies.refresh_token) {
      return request.cookies.refresh_token;
    }

    return undefined;
  }
}
