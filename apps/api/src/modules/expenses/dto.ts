import { z } from 'zod';

const EXPENSE_TYPES = ['toll', 'parking', 'repair', 'misc', 'document'] as const;

export const createExpenseSchema = z.object({
  vehicleId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
  type: z.enum(EXPENSE_TYPES),
  amount: z.number().min(0),
  incurredAt: z.string().datetime(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export interface ExpenseResponse {
  id: string;
  vehicleId: string;
  tripId: string | null;
  type: string;
  amount: string;
  incurredAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRollup {
  vehicleId: string;
  totalAmount: string;
  count: number;
  byType: Record<string, { total: string; count: number }>;
}
