import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '../components/layout/app-layout.js';
import { useAuthStore } from '../features/auth/store.js';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    const { session } = useAuthStore.getState();
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: () => <AppLayout />,
});
