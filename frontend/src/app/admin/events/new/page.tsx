'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { adminEventsApi, CreateEventDto } from '@/features/admin/api/events.api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { EventType } from '@shared';

export default function NewEventPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateEventDto>();

  const createMutation = useMutation({
    mutationFn: adminEventsApi.createEvent,
    onSuccess: () => {
      toast.success('Event created successfully');
      router.push('/admin/events');
    },
    onError: (error) => {
      toast.error('Failed to create event');
      console.error(error);
    },
  });

  const onSubmit = (data: CreateEventDto) => {
    // Ensure types are correct
    const payload = {
      ...data,
      duration: Number(data.duration),
      price: Number(data.price),
      date: new Date(data.date).toISOString(),
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/events" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>
        <h1 className="text-2xl font-bold">Create New Event</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-gray-900 p-8 rounded-xl border border-gray-800">
        
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Event Title</label>
          <input
            {...register('title', { required: 'Title is required' })}
            className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 focus:border-brand-500 focus:outline-none"
            placeholder="e.g. Avengers: Endgame"
          />
          {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
            <select
              {...register('type', { required: 'Type is required' })}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 focus:border-brand-500 focus:outline-none"
            >
              <option value={EventType.MOVIE}>Movie</option>
              <option value={EventType.CONCERT}>Concert</option>
              <option value={EventType.SPORTS}>Sports</option>
              <option value={EventType.OTHER}>Other</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Language</label>
             <input
              {...register('language', { required: 'Language is required' })}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 focus:border-brand-500 focus:outline-none"
              placeholder="e.g. English"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Duration (mins)</label>
            <input
              type="number"
              {...register('duration', { required: 'Duration is required', min: 1 })}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Base Price</label>
            <input
              type="number"
              {...register('price', { required: 'Price is required', min: 0 })}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Date & Time */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Date & Time</label>
          <input
            type="datetime-local"
            {...register('date', { required: 'Date is required' })}
            className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 focus:border-brand-500 focus:outline-none [color-scheme:dark]"
          />
        </div>

        {/* Location */}
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
             <input
              {...register('location', { required: 'Location is required' })}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 focus:border-brand-500 focus:outline-none"
              placeholder="e.g. Grand Cinema"
            />
        </div>

         {/* Poster URL */}
         <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Poster URL</label>
             <input
              {...register('posterUrl')}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 focus:border-brand-500 focus:outline-none"
              placeholder="https://..."
            />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 focus:border-brand-500 focus:outline-none"
            placeholder="Event description..."
          />
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Event'
          )}
        </button>
      </form>
    </div>
  );
}
