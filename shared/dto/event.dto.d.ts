export declare enum EventType {
    CONCERT = "CONCERT",
    MOVIE = "MOVIE",
    SPORTS = "SPORTS",
    OTHER = "OTHER"
}
export declare class CreateEventDto {
    title: string;
    type: EventType;
    language: string;
    duration: number;
    posterUrl?: string;
    description?: string;
    date: string;
    location: string;
    price: number;
    totalSeats?: number;
    availableSeats?: number;
}
export declare class UpdateEventDto {
    title?: string;
    type?: EventType;
    language?: string;
    duration?: number;
}
export declare class FilterEventsDto {
    city?: string;
    type?: EventType;
    from?: string;
    to?: string;
    search?: string;
    date?: string;
}
export interface EventDto {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    price: number;
    totalSeats: number;
    availableSeats: number;
    posterUrl?: string;
}
