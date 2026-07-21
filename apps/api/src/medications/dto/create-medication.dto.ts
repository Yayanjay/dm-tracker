import { IsString, IsArray, Matches, ArrayMinSize } from "class-validator";

export class CreateMedicationDto {
  @IsString()
  patientId: string;

  @IsString()
  name: string;

  @IsString()
  dosage: string;

  @IsString()
  unit: string;

  @IsArray()
  @IsString({ each: true })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    each: true,
    message: "Setiap jadwal harus dalam format HH:mm",
  })
  @ArrayMinSize(1, { message: "Minimal satu jadwal diperlukan" })
  scheduleTimes: string[];
}
