import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type FamilyMemberRole = 'owner' | 'member';

@Entity('family_members')
@Unique(['familyId', 'userId'])
@Unique(['userId'])
export class FamilyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  familyId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 16, default: 'member' })
  role: FamilyMemberRole;

  @CreateDateColumn()
  joinedAt: Date;
}
