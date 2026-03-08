import { api } from "@/lib/api";

import { CreateEventDto as SharedCreateEventDto } from "@shared";

export type CreateEventDto = SharedCreateEventDto;

export const adminEventsApi = {
  getEvents: async () => {
    const response = await api.get("/admin/events");
    return response.data;
  },

  createEvent: async (data: CreateEventDto) => {
    const response = await api.post("/admin/events", data);
    return response.data;
  },

  deleteEvent: async (id: string) => {
    const response = await api.delete(`/admin/events/${id}`);
    return response.data;
  },
};
