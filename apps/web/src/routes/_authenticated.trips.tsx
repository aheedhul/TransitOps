import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/trips')({
  component: () => (
    <div>
      <h1 className="text-2xl font-bold">Trips</h1>
      <p className="mt-2 text-muted-foreground">Trip management will appear here.</p>
    </div>
  ),
});
