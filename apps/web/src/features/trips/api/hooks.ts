import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type PaginatedResponse, type SingleResponse } from './client.js';
import type {
  TripResponse,
  CreateTripInput,
  UpdateTripInput,
  DispatchTripInput,
  DispatchCheckInput,
  DispatchCheckResponse,
  DispatchRecommendationResponse,
} from './types.js';
import { enqueueMutation } from '../../offline/sync-engine.js';

export function useTrips(page = 1) {
  return useQuery<PaginatedResponse<TripResponse>>({
    queryKey: ['trips', page],
    queryFn: () => api.get(`/trips?page=${page}`),
  });
}

export function useTrip(id: string) {
  return useQuery<SingleResponse<TripResponse>>({
    queryKey: ['trips', id],
    queryFn: () => api.get(`/trips/${id}`),
    enabled: !!id,
  });
}

export function useCreateTrip() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripInput) => api.post<SingleResponse<TripResponse>>('/trips', input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useUpdateTrip() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateTripInput) =>
      api.put<SingleResponse<TripResponse>>(`/trips/${id}`, input),
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ['trips'] });
      client.invalidateQueries({ queryKey: ['trips', id] });
    },
  });
}

export function useDeleteTrip() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/trips/${id}`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useDispatchTrip() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & DispatchTripInput) =>
      api.post<SingleResponse<TripResponse>>(`/trips/${id}/dispatch`, input),
    onMutate: async ({ id, ...input }) => {
      await enqueueMutation('trip.dispatch', id, input);
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ['trips'] });
      client.invalidateQueries({ queryKey: ['trips', id] });
    },
  });
}

export function useStartTrip() {
  const client = useQueryClient();
  const keyRef = { current: '' };

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; lat?: number; lng?: number; odometerKm?: number }) =>
      api.post<SingleResponse<TripResponse>>(`/trips/${id}/start`, input),
    onMutate: async ({ id, ...input }) => {
      keyRef.current = await enqueueMutation('trip.start', id, input);
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ['trips'] });
      client.invalidateQueries({ queryKey: ['trips', id] });
    },
    onError: () => {
      keyRef.current = '';
    },
  });
}

export function useCompleteTrip() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      actualDistanceKm: number;
      fuelConsumedL: number;
      actualTravelMins?: number;
    }) => api.post<SingleResponse<TripResponse>>(`/trips/${id}/complete`, input),
    onMutate: async ({ id, ...input }) => {
      await enqueueMutation('trip.complete', id, input);
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ['trips'] });
      client.invalidateQueries({ queryKey: ['trips', id] });
    },
  });
}

export function useCancelTrip() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      cancelReason: 'customer' | 'vehicle_breakdown' | 'weather' | 'compliance' | 'duplicate' | 'other';
    }) => api.post<SingleResponse<TripResponse>>(`/trips/${id}/cancel`, input),
    onMutate: async ({ id, ...input }) => {
      await enqueueMutation('trip.cancel', id, input);
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ['trips'] });
      client.invalidateQueries({ queryKey: ['trips', id] });
    },
  });
}

export function useDispatchCheck() {
  return useMutation({
    mutationFn: (input: DispatchCheckInput) =>
      api.post<SingleResponse<DispatchCheckResponse>>('/intelligence/dispatch-check', input),
  });
}

export function useDispatchRecommendation() {
  return useMutation({
    mutationFn: (input: {
      cargoWeightKg: number;
      sourceLat?: number;
      sourceLng?: number;
      plannedDepartureAt?: string;
      limit?: number;
    }) =>
      api.post<SingleResponse<DispatchRecommendationResponse>>(
        '/intelligence/dispatch-recommendation',
        input,
      ),
  });
}
