
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistApi, WishlistItem } from '../api/wishlist.api';

export function useWishlist() {
  const queryClient = useQueryClient();

  // Fetch Wishlist
  const { data: wishlist = [], isLoading, isError } = useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistApi.getMyWishlist,
    retry: 1, // Don't retry endlessly if not logged in
  });

  // Check if an event is in wishlist
  const isInWishlist = (eventId: string) => {
    return wishlist.some((item) => item.eventId === eventId);
  };

  // Add to Wishlist
  const addMutation = useMutation({
    mutationFn: wishlistApi.add,
    onSuccess: (newItem) => {
      queryClient.setQueryData<WishlistItem[]>(['wishlist'], (old = []) => [
        newItem,
        ...old,
      ]);
    },
  });

  // Remove from Wishlist
  const removeMutation = useMutation({
    mutationFn: wishlistApi.remove,
    onSuccess: (_, eventId) => {
      queryClient.setQueryData<WishlistItem[]>(['wishlist'], (old = []) =>
        old.filter((item) => item.eventId !== eventId)
      );
    },
  });

  const toggleWishlist = (eventId: string) => {
    if (isInWishlist(eventId)) {
      removeMutation.mutate(eventId);
    } else {
      addMutation.mutate(eventId);
    }
  };

  return {
    wishlist,
    isLoading,
    isError,
    isInWishlist,
    toggleWishlist,
    isToggling: addMutation.isPending || removeMutation.isPending,
  };
}
