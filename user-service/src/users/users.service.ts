import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  createUser(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        push_token: true,
        created_at: true,
        updated_at: true,
        preferences: true,
      },
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  findAllUsers() {
    return this.prisma.user.findMany({ 
      select: {
        id: true,
        email: true,
        name: true,
        push_token: true,
        created_at: true,
        updated_at: true,
        preferences: true,
      },
    });
  }

  async updateUser(id: string, body: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.push_token !== undefined) updateData.push_token = body.push_token;

    if (body.preferences) {
      updateData.preferences = {
        upsert: {
          create: {
            email_notifications: body.preferences.email ?? true,
            push_notifications: body.preferences.push ?? true,
          },
          update: {
            ...(body.preferences.email !== undefined && { email_notifications: body.preferences.email }),
            ...(body.preferences.push !== undefined && { push_notifications: body.preferences.push }),
          },
        },
      };
    }

    return await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        push_token: true,
        created_at: true,
        updated_at: true,
        preferences: true,
      },
    });
  }
}
