export declare enum ApplicationStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare enum PlatformFeeType {
    PERCENTAGE = "PERCENTAGE",
    FLAT = "FLAT"
}
export declare enum ReviewAction {
    APPROVE = "APPROVE",
    REJECT = "REJECT"
}
export declare class CreateTheaterApplicationDto {
    theaterName: string;
    ownerName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    gstNumber?: string;
}
export declare class ReviewTheaterApplicationDto {
    action: ReviewAction;
    reviewNotes?: string;
}
export declare class CreateTheaterDto {
    name: string;
    city: string;
    address: string;
}
export declare class UpdateMonetizationDto {
    enabled?: boolean;
    type?: PlatformFeeType;
    value?: number;
}
export interface ScreenDto {
    id: string;
    name: string;
    theaterId: string;
}
export interface TheaterDto {
    id: string;
    name: string;
    city: string;
    address: string;
    screens?: ScreenDto[];
}
