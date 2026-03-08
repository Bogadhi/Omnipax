
import { api } from '@/lib/api';
import { Event } from '@/features/events/types';

export interface WishlistItem {
  id: string;
  userId: string;
  eventId: string;
  createdAt: string;
  event: Event;
}

export const wishlistApi = {
  add: async (eventId: string): Promise<WishlistItem> => {
    const response = await api.post<WishlistItem>(`/wishlist/${eventId}`);
    return response.data;
  },

  remove: async (eventId: string): Promise<void> => {
    await api.delete(`/wishlist/${eventId}`);
  },

  getMyWishlist: async (): Promise<WishlistItem[]> => {
    const response = await api.get<WishlistItem[]>('/wishlist/my');
    return response.data;
  },
};
