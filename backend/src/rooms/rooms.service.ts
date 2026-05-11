import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.room.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException('Переговорная не найдена');
    }
    return room;
  }

  create(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        name: dto.name.trim(),
        capacity: dto.capacity,
        description: dto.description?.trim() ?? null,
        location: dto.location?.trim() ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.findOne(id);
    return this.prisma.room.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.location !== undefined && { location: dto.location?.trim() ?? null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.room.delete({ where: { id } });
    return { ok: true };
  }
}
