export declare class CreateShowDto {
    eventId: string;
    screenId: string;
    startTime: string;
    basePrice: number;
}
export interface ShowDto {
    id: string;
    startTime: string;
    price: number;
    isActive: boolean;
    totalCapacity: number;
    remainingCapacity: number;
}
