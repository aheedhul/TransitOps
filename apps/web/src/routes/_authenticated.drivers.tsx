import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/drivers')({
  component: () => (
    <div>
      <h1 className="text-2xl font-bold">Drivers</h1>
      <p className="mt-2 text-muted-foreground">Driver management will appear here.</p>
    </div>
  ),
});
