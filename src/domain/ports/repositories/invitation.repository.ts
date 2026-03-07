import type { Invitation, NewInvitation } from "../../entities/index.js";

export interface InvitationRepository {
  findByTokenHash(tokenHash: string): Promise<Invitation | null>;
  findByOrg(orgId: string): Promise<Invitation[]>;
  create(data: NewInvitation): Promise<Invitation>;
  markUsed(id: string, usedBy: string): Promise<Invitation | null>;
  delete(id: string): Promise<boolean>;
}
