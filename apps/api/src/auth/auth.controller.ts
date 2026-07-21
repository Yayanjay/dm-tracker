import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginRequest, LoginResponse, ApiResponse } from "@dm-tracker/shared";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const result = await this.authService.login(dto);
    return {
      code: HttpStatus.OK,
      message: "Login berhasil",
      data: result,
    };
  }
}
