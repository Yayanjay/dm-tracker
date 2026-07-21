import { IsString, IsOptional, IsDateString, Matches } from "class-validator";

export class CreatePatientDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: "Nomor WA harus berupa angka 10-15 digit tanpa +, -, atau spasi",
  })
  waNumber: string;

  @IsDateString()
  @IsOptional()
  dob?: string;
}
