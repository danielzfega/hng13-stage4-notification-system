import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ResponseDto } from '../common/dto/response.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Send notification',
    description: 'Queue a notification (email or push) for asynchronous processing'
  })
  @ApiResponse({ 
    status: HttpStatus.ACCEPTED, 
    description: 'Notification queued successfully'
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid request data'
  })
  async sendNotification(@Body() createNotificationDto: CreateNotificationDto) {
    const result = await this.notificationService.routeNotification(createNotificationDto);
    return ResponseDto.success(result, 'Notification queued successfully');
  }

  @Get('status/:requestId')
  @ApiOperation({ 
    summary: 'Get notification status',
    description: 'Retrieve the delivery status of a notification by request ID'
  })
  @ApiParam({ 
    name: 'requestId', 
    description: 'Unique request identifier',
    example: 'req-12345-abcde'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Notification status retrieved'
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Notification not found'
  })
  async getNotificationStatus(@Param('requestId') requestId: string) {
    const status = await this.notificationService.getNotificationStatus(requestId);
    return ResponseDto.success(status, 'Notification status retrieved');
  }
}
