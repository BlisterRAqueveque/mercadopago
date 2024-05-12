import { Controller, Get, HttpStatus, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentsService) {}

  @Get(':id')
  async getUserPayment(@Param('id') id: number, @Res() res: Response) {
    const result = await this.paymentService.getUserPayment(id);
    res.status(HttpStatus.OK).json({
      ok: true,
      result,
      msg: 'Approved',
    });
  }

  @Get('payment-status/collector')
  async getUserPaymentStatusByCollectorId(
    @Query('collector_id') collector_id: number,
    @Res() res: Response,
  ) {
    const status =
      await this.paymentService.getUserPaymentStatusByCollectorId(collector_id);
    res.status(HttpStatus.OK).json({
      status: status,
    });
  }
}
