import { createFileRoute } from '@tanstack/react-router';
import { TripCreateForm } from '../features/trips/index.js';

export const Route = createFileRoute('/_authenticated/trips/new')({
  component: () => <TripCreateForm />,
});
