import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/vehicles')({
  component: () => (
    <div>
      <h1 className="text-2xl font-bold">Vehicles</h1>
      <p className="mt-2 text-muted-foreground">Vehicle fleet management will appear here.</p>
    </div>
  ),
});
