import { IsString, IsArray, IsOptional, IsBoolean, Matches, ArrayMinSize } from "class-validator";

export class UpdatePatientMedicationDto {
  @IsArray()
  @IsString({ each: true })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, { each: true, message: "Setiap jadwal harus dalam format HH:mm" })
  @ArrayMinSize(1, { message: "Minimal satu jadwal diperlukan" })
  @IsOptional()
  scheduleTimes?: string[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
