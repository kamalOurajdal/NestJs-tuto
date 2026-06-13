import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export type UserAuthRecord = Pick<
  User,
  '_id' | 'email' | 'name' | 'age' | 'isActive'
> & {
  passwordHash: string;
};

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, ...rest } = createUserDto;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    return await this.userModel.create({
      ...rest,
      passwordHash,
    });
  }

  async findByEmailWithPasswordHash(
    email: string,
  ): Promise<UserAuthRecord | null> {
    const normalized = email.trim().toLowerCase();
    const doc = await this.userModel
      .findOne({ email: normalized })
      .select('+passwordHash')
      .lean<UserAuthRecord>()
      .exec();

    return doc;
  }

  async findAll(): Promise<User[]> {
    return await this.userModel.find();
  }

  async findOne(id: string): Promise<User | null> {
    return await this.userModel.findById(id);
  }
  async findById(id: string): Promise<User | null> {
    return await this.userModel.findById(id);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    const { password, ...rest } = updateUserDto;
    const payload: Record<string, unknown> = { ...rest };

    if (password !== undefined) {
      payload.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    return await this.userModel.findByIdAndUpdate(id, payload, { new: true });
  }

  async remove(id: string): Promise<User | null> {
    return await this.userModel.findByIdAndDelete(id);
  }
}
