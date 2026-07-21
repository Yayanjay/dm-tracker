import { IsString, IsArray, IsOptional, IsBoolean, Matches, ArrayMinSize } from "class-validator";

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

  @IsArray()
  @IsString({ each: true })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    each: true,
    message: "Setiap jadwal harus dalam format HH:mm",
  })
  @ArrayMinSize(1, { message: "Minimal satu jadwal diperlukan" })
  @IsOptional()
  scheduleTimes?: string[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
