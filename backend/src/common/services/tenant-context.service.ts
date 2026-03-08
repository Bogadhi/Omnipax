import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string | null;
  isSuperAdmin: boolean;
}

@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  run<T>(store: TenantStore, callback: () => T): T {
    return this.als.run(store, callback);
  }

  getStore(): TenantStore | undefined {
    return this.als.getStore();
  }

  getTenantId(): string | null {
    return this.getStore()?.tenantId || null;
  }

  isSuperAdmin(): boolean {
    return this.getStore()?.isSuperAdmin || false;
  }
}
