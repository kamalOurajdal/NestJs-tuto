import {
  Injectable,
  PipeTransform,
  UnauthorizedException,
} from '@nestjs/common';

import { UsersService } from '../../users/users.service';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class LoadUserByIdPipe implements PipeTransform<string> {
  constructor(private readonly usersService: UsersService) {}

  async transform(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
