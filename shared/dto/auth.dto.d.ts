export declare class LoginDto {
    email: string;
    otp: string;
}
export declare class RequestOtpDto {
    email: string;
}
export interface LoginResponse {
    access_token: string;
    user: {
        id: string;
        email: string;
        name?: string;
        role: string;
        tenantId?: string | null;
        theaterId?: string | null;
    };
}
