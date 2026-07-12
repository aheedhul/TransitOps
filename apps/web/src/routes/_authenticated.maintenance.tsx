import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/maintenance')({
  component: () => (
    <div>
      <h1 className="text-2xl font-bold">Maintenance</h1>
      <p className="mt-2 text-muted-foreground">Maintenance logs will appear here.</p>
    </div>
  ),
});
