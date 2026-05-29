import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type FamilyInvitationStatus = 'pending' | 'accepted' | 'declined';

@Entity('family_invitations')
export class FamilyInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  familyId: string;

  @Column({ type: 'uuid' })
  inviterId: string;

  @Column()
  inviteeEmail: string;

  @Column({ type: 'uuid', nullable: true })
  inviteeId: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: FamilyInvitationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;
}
