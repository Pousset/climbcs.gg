import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DemoStatus = 'processing' | 'ready' | 'failed';

@Entity('demos')
@Index(['userId', 'dayKey'])
export class Demo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  originalName!: string;

  @Column({ type: 'integer' })
  sizeBytes!: number;

  @Column({ type: 'varchar', length: 16, default: 'processing' })
  status!: DemoStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  map!: string | null;

  @Column({ type: 'integer', nullable: true })
  roundCount!: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  errorCode!: string | null;

  /** UTC day (`YYYY-MM-DD`) the demo was submitted, used for the daily quota. */
  @Column({ type: 'varchar', length: 10 })
  dayKey!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export interface PublicDemo {
  id: string;
  originalName: string;
  sizeBytes: number;
  status: DemoStatus;
  map: string | null;
  roundCount: number | null;
  errorCode: string | null;
  createdAt: string;
}

export function toPublicDemo(demo: Demo): PublicDemo {
  return {
    id: demo.id,
    originalName: demo.originalName,
    sizeBytes: demo.sizeBytes,
    status: demo.status,
    map: demo.map,
    roundCount: demo.roundCount,
    errorCode: demo.errorCode,
    createdAt: demo.createdAt.toISOString(),
  };
}
