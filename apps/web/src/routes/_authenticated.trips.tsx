import { createFileRoute } from '@tanstack/react-router';
import { TripList } from '../features/trips/index.js';

export const Route = createFileRoute('/_authenticated/trips')({
  component: () => <TripList />,
});
