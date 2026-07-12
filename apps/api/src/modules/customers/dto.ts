import { z } from 'zod';

const CUSTOMER_TYPES = ['shipper', 'receiver', 'both'] as const;

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().max(200).optional(),
  contactPhone: z.string().max(20).optional(),
  billingAddress: z.string().max(500).optional(),
  type: z.enum(CUSTOMER_TYPES).default('shipper'),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export interface CustomerResponse {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingAddress: string | null;
  type: string;
  createdAt: string;
  updatedAt: string;
}
