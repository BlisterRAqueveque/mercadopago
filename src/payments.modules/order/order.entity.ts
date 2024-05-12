import {
  Column,
  Entity,
  PrimaryGeneratedColumn
} from 'typeorm';

@Entity('orders')
export class OrdersEntity {
  @PrimaryGeneratedColumn('uuid')
  order_id?: string;
  @Column('varchar', { length: 100, nullable: true })
  id?: number;
  @Column('varchar', { length: 100, nullable: true })
  type?: string;
}
