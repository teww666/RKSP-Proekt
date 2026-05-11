import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findMyAndAll(@CurrentUser() user: JwtPayload) {
    return this.bookingsService.findForActor(user.sub, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.findOne(id, user.sub, user.role);
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.create(dto, user.sub, user.role);
  }

  /** Узкий маршрут должен быть выше `:id`, иначе `confirm` воспринимается как id. */
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.update(id, { status: 'CONFIRMED' }, user.sub, user.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingsService.update(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.cancel(id, user.sub, user.role);
  }
}
