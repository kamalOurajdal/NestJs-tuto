import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEmail,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  age: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class FindOneParams {
  @IsString()
  @IsNotEmpty()
  id: string;
}
