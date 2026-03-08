import { EventDto, FilterEventsDto } from '@shared';

export type Event = EventDto & {
  createdAt: string;
  updatedAt: string;
};

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total?: number;
    page?: number;
    lastPage?: number;
    limit?: number;
    nextCursor?: string | null;
    hasNextPage?: boolean;
  };
}

export type EventFilters = FilterEventsDto & {
  page?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  cursor?: string;
};
