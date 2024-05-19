import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RunnerEntity } from './runners/runners.entity';
import { RunnersService } from './runners/runners.service';
import { RunnersController } from './runners/runners.controller';

@Module({
    imports: [TypeOrmModule.forFeature([RunnerEntity])],
    providers: [RunnersService],
    controllers: [RunnersController]
})
export class RunnersModule {}
