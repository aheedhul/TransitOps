import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: () => (
    <div>
      <h1 className="text-2xl font-bold">Command Center</h1>
      <p className="mt-2 text-muted-foreground">Fleet overview and KPIs will appear here.</p>
    </div>
  ),
});
