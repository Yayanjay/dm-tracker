import { IsString, IsOptional, IsDateString, Matches } from "class-validator";

export class CreatePatientDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^\+?[\d\s-]{9,20}$/, {
    message: "Nomor WA harus diawali 08 atau +62, boleh memakai spasi atau tanda -",
  })
  waNumber: string;

  @IsDateString()
  @IsOptional()
  dob?: string;
}
