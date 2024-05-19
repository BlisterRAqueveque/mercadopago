import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrdersEntity } from '../order/order.entity';
import { PayersEntity } from '../payer/payer.entity';
import { CardEntity } from 'src/payments.modules/card/card.entity';
import { RunnerEntity } from 'src/runners.modules/runners/runners.entity';

@Entity('payments')
export class PaymentsEntity {
  @PrimaryGeneratedColumn('uuid')
  payment_id?: string;
  @Column('bigint', { nullable: true })
  collector_id?: number;
  @Column('varchar', { length: 20, nullable: true })
  currency_id?: string;
  @Column('timestamp')
  date_approved?: Date;
  @Column('timestamp without time zone')
  date_created?: Date;
  @Column('varchar', { length: 100, nullable: true })
  description?: string;
  @Column('bigint', { nullable: true })
  id?: number;
  @Column('varchar', { length: 50, nullable: true })
  status?: string;
  @Column('varchar', { length: 50, nullable: true })
  status_detail?: string;
  @Column('double precision', { default: 0 })
  transaction_amount?: number;

  @OneToOne(() => OrdersEntity, { cascade: true })
  @JoinColumn()
  order: OrdersEntity;

  @OneToOne(() => PayersEntity, { cascade: true })
  @JoinColumn()
  payer: PayersEntity;

  @ManyToOne(() => CardEntity, (card) => card.payment, { cascade: true })
  card: CardEntity;

  //@Column('int', { default: 0, comment: 'ID del usuario que realiza el pago' }
  @JoinColumn({
    name: 'payer_id',
    referencedColumnName: 'id',
  })
  @ManyToOne(() => RunnerEntity, (payer_id) => payer_id.payment_id)
  payer_id: number;

  @Column('text', { nullable: true })
  item_description: string;

  @Column('text', { nullable: true })
  item_title: string;
}
