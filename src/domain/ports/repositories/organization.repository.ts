import type { Organization, NewOrganization } from "../../entities/index.js";

export interface OrganizationRepository {
  findByOrgId(orgId: string): Promise<Organization | null>;
  create(data: NewOrganization): Promise<Organization>;
  update(orgId: string, data: Partial<Omit<NewOrganization, "orgId">>): Promise<Organization>;
  deleteByOrgId(orgId: string): Promise<void>;
}
