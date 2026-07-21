import { IsString, IsOptional, IsArray, IsEnum } from "class-validator";
import { TemplateType } from "@dm-tracker/shared";

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  buttonLabels?: string[];
}
