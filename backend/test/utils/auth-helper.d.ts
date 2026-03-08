import { INestApplication } from '@nestjs/common';
export declare function loginUser(app: INestApplication, email: string, role?: string): Promise<string>;
