import {
    Column,
    Entity,
    PrimaryGeneratedColumn
} from 'typeorm';

@Entity('payers')
export class PayersEntity {
  @PrimaryGeneratedColumn('uuid')
  payer_id?: string;
  @Column('varchar', { length: 100, nullable: true })
  id?: string;
  @Column('varchar', { length: 100, nullable: true })
  first_name?: string;
  @Column('varchar', { length: 100, nullable: true })
  last_name?: string;
  @Column('varchar', { length: 100, nullable: true })
  email?: string;
}
