import { createFileRoute } from '@tanstack/react-router';
import { FleetMap } from '../features/fleet/index.js';

export const Route = createFileRoute('/_authenticated/map')({
  component: () => <FleetMap />,
});
