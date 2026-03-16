import { Request } from 'express';

export interface JwtUser {
  id: string;
  email: string;
}

export interface TenantContext {
  id: string;
  slug: string;
}

export type RequestContext = Request & {
  user?: JwtUser | null;
  tenant?: TenantContext;
  rawBody?: string;
};
