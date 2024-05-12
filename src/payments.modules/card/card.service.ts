import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardDto } from './card.dto';
import { CardEntity } from './card.entity';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(CardEntity) private orderRepository: Repository<CardDto>,
  ) {}

  async insert(order: CardDto): Promise<CardDto> {
    try {
      return await this.orderRepository.save(order);
    } catch (e: any) {
      throw new HttpException(`${e.message}`, e.status);
    }
  }
}
