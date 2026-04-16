import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateUserDto {
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