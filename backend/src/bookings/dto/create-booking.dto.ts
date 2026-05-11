import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/** Создание бронирования текущим пользователем (userId берётся из JWT). */
export class CreateBookingDto {
  @IsUUID('4')
  roomId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  /** Только ADMIN/MANAGER могут указать пользователя для чужого бронирования. */
  @IsOptional()
  @IsUUID('4')
  targetUserId?: string;
}
