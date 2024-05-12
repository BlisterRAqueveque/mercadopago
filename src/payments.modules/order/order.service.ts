import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersDto } from './order.dto';
import { OrdersEntity } from './order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrdersEntity)
    private orderRepository: Repository<OrdersDto>,
  ) {}

  async insert(order: OrdersDto): Promise<OrdersDto> {
    try {
      return await this.orderRepository.save(order);
    } catch (e: any) {
      throw new HttpException(`${e.message}`, e.status);
    }
  }
}
