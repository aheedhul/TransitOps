import { createFileRoute } from '@tanstack/react-router';
import { DigitalTwinGrid } from '../features/fleet/index.js';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Command Center</h1>
      <DigitalTwinGrid />
    </div>
  ),
});
