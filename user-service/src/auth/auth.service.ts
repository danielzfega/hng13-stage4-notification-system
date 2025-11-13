import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async hashpassword(password: string) {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  async signup(body: SignupDto) {
    const { email, password, name, push_token, preferences } = body;

    const existingUser = await this.userService.findUserByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User with email already exists');
    }
    const hashedPassword = await this.hashpassword(password);
    const user = await this.userService.createUser({
      email,
      name,
      password: hashedPassword,
      push_token,
      preferences: {
        create: {
          email_notifications: preferences.email,
          push_notifications: preferences.push,
        },
      },
    });
    return {
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        push_token: user.push_token,
      },
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findUserByEmail(email);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (user && isPasswordValid) {
      return user;
    }
    return null;
  }

  async login(user: any) {
    const tokenPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(tokenPayload, {
      secret: this.configService.getOrThrow('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow('JWT_EXPIRATION'),
    });
    return {
      success: true,
      message: 'Login successful',
      data: {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    };
  }
}
