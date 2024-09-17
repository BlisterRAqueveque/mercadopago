import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RunnerEntity } from './runners.entity';
import { QueryFailedError, Repository } from 'typeorm';
import { RunnerDto } from './runners.dto';

@Injectable()
export class RunnersService {
  constructor(
    @InjectRepository(RunnerEntity)
    private readonly repo: Repository<RunnerDto>,
  ) {}

  async setMailSent(id: number) {
    try {
      const user = await this.repo.findOne({ where: { id } });
      user.mailSent = true;
      const result = await this.repo.save(user);
      return result;
    } catch (error: any) {
      if (error instanceof QueryFailedError)
        throw new HttpException(`${error.name} ${error.driverError}`, 404);
      throw new HttpException(error.message, error.status);
    }
  }
}
