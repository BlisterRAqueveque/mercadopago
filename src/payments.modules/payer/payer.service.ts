import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayersDto } from './payer.dto';
import { PayersEntity } from './payer.entity';

@Injectable()
export class PayerService {
  constructor(
    @InjectRepository(PayersEntity)
    private payerRepository: Repository<PayersDto>,
  ) {}

  async insert(payer: PayersDto): Promise<PayersDto> {
    try {
      return await this.payerRepository.save(payer);
    } catch (e: any) {
      throw new HttpException(`${e.message}`, e.status);
    }
  }
}
