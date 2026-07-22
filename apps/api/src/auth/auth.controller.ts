import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginRequest, LoginResponse } from "@kawalgula/shared";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginRequest): Promise<LoginResponse> {
    return this.authService.login(dto);
  }
}
