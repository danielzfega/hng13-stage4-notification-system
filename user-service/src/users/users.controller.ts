import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-users.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt.guard';
import { CurrentUser } from 'src/auth/decorator/current-user';
import { User } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getusers() {
    const users = await this.userService.findAllUsers();
    return {
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      meta: {
        total: users.length,
        limit: users.length,
        page: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    };
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const user = await this.userService.findUserById(id);
    return {
      success: true,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {
    const updatedUser = await this.userService.updateUser(user.id, updateUserDto);
    return {
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    };
  }
}
