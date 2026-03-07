import { eq, desc, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { invitations } from "../db/schema.js";
import type { InvitationRow, NewInvitationRow } from "../db/schema.js";
import type { InvitationRepository } from "../../domain/ports/repositories/invitation.repository.js";
import type { Invitation, NewInvitation } from "../../domain/entities/index.js";

export class DrizzleInvitationRepository implements InvitationRepository {
  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const result = await db.query.invitations.findFirst({
      where: eq(invitations.tokenHash, tokenHash),
    });
    return result ?? null;
  }

  async findByOrg(orgId: string): Promise<Invitation[]> {
    return db
      .select()
      .from(invitations)
      .where(eq(invitations.orgId, orgId))
      .orderBy(desc(invitations.createdAt));
  }

  async create(data: NewInvitation): Promise<Invitation> {
    const [row] = await db.insert(invitations).values(data as NewInvitationRow).returning();
    return row!;
  }

  async markUsed(id: string, usedBy: string): Promise<Invitation | null> {
    const result = await db
      .update(invitations)
      .set({ usedAt: new Date(), usedBy })
      .where(eq(invitations.id, id))
      .returning();
    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(invitations)
      .where(eq(invitations.id, id))
      .returning({ id: invitations.id });
    return result.length > 0;
  }
}
