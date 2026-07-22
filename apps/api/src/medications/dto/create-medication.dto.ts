import { IsString, IsOptional } from "class-validator";

export class CreateMedicationDto {
  @IsString()
  name: string;

  @IsString()
  dosage: string;

  @IsString()
  unit: string;
}
