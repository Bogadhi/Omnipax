'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin.api';
import { CreateShowPayload, Theater, Screen } from '../types';
import { toast } from 'sonner';
import { X, Calendar, Clock, MapPin, Film } from 'lucide-react';

interface CreateShowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateShowModal({ isOpen, onClose }: CreateShowModalProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateShowPayload>();
  const selectedTheaterId = watch('theaterId' as any);

  // Queries for dropdowns
  const { data: events } = useQuery({
    queryKey: ['events', 'admin'],
    queryFn: adminApi.getAllEvents,
  });

  const { data: theaters } = useQuery({
    queryKey: ['theaters'],
    queryFn: adminApi.getTheaters,
  });

  const { data: screens } = useQuery({
    queryKey: ['screens', { theaterId: selectedTheaterId }],
    queryFn: () => adminApi.getScreens(selectedTheaterId),
    enabled: !!selectedTheaterId,
  });

  const mutation = useMutation({
    mutationFn: adminApi.createShow,
    onSuccess: () => {
      toast.success('Show created successfully');
      queryClient.invalidateQueries({ queryKey: ['shows', 'admin'] });
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create show');
    },
  });

  const onSubmit = (data: any) => {
    const { theaterId, ...payload } = data;
    mutation.mutate({
      ...payload,
      basePrice: Number(data.basePrice),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Add New Show</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Event selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Film className="w-4 h-4" />
              Select Event
            </label>
            <select
              {...register('eventId', { required: 'Event is required' })}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="">Choose an event...</option>
              {events?.map((event: any) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
            {errors.eventId && <p className="text-xs text-red-500">{errors.eventId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Theater selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Theater
              </label>
              <select
                {...register('theaterId' as any, { required: 'Theater is required' })}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="">Select Theater...</option>
                {theaters?.map((theater: any) => (
                  <option key={theater.id} value={theater.id}>{theater.name}</option>
                ))}
              </select>
            </div>

            {/* Screen selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Screen
              </label>
              <select
                {...register('screenId', { required: 'Screen is required' })}
                disabled={!selectedTheaterId}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Screen...</option>
                {screens?.map((screen: any) => (
                  <option key={screen.id} value={screen.id}>{screen.name}</option>
                ))}
              </select>
              {errors.screenId && <p className="text-xs text-red-500">{errors.screenId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start Time
              </label>
              <input
                type="datetime-local"
                {...register('startTime', { required: 'Start time is required' })}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
              />
              {errors.startTime && <p className="text-xs text-red-500">{errors.startTime.message}</p>}
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">
                Ticket Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('basePrice' as any, { required: 'Price is required', min: 0 })}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="0.00"
              />
              {errors.basePrice && <p className="text-xs text-red-500">{(errors.basePrice as any).message}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Show'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
