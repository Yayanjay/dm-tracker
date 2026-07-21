import { IsString, IsOptional, IsDateString } from "class-validator";

export class UpdatePatientDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  dob?: string;
}
