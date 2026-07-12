import { createFileRoute } from '@tanstack/react-router';
import { TripDetail } from '../features/trips/index.js';

export const Route = createFileRoute('/_authenticated/trips/$id')({
  component: () => <TripDetail />,
});
