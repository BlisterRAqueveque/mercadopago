import { PaymentsEntity } from 'src/payments.modules/payments/payment.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('card')
export class CardEntity {
  @PrimaryGeneratedColumn('uuid')
  card_id: string;
  @Column({ type: 'varchar', nullable: true, length: 100 })
  id: string;
  @Column({ type: 'varchar', nullable: true, length: 100 })
  first_six_digits: string;
  @Column({ type: 'varchar', nullable: true, length: 100 })
  last_four_digits: string;
  @Column({ type: 'int', nullable: true })
  expiration_month: number;
  @Column({ type: 'int', nullable: true })
  expiration_year: number;
  @Column({ type: 'varchar', nullable: true, length: 100 })
  date_created: string;
  @Column({ type: 'varchar', nullable: true, length: 100 })
  date_last_updated: string;

  @OneToMany(() => PaymentsEntity, (payment) => payment.card)
  payment: PaymentsEntity[];
}
