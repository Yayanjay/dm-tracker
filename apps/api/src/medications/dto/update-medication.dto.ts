import { IsString, IsOptional } from "class-validator";

export class UpdateMedicationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  dosage?: string;

  @IsString()
  @IsOptional()
  unit?: string;
}
