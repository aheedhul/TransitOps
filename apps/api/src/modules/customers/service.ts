import { CustomerRepository } from './repository.js';
import type { CreateCustomerInput, UpdateCustomerInput, CustomerResponse } from './dto.js';

export class CustomerService {
  constructor(private readonly repo: CustomerRepository = new CustomerRepository()) {}

  async list(orgId: string, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.repo.findAll(orgId, pageSize, offset),
      this.repo.count(orgId),
    ]);
    return {
      data: rows.map(serializeCustomer),
      meta: {
        total,
        page,
        page_size: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: string, orgId: string) {
    const customer = await this.repo.findById(id, orgId);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }
    return serializeCustomer(customer);
  }

  async create(input: CreateCustomerInput, orgId: string) {
    const existing = await this.repo.findByName(input.name, orgId);
    if (existing) {
      throw new ConflictError('A customer with this name already exists');
    }

    const customer = await this.repo.create({
      ...input,
      organizationId: orgId,
    });

    return serializeCustomer(customer);
  }

  async update(id: string, orgId: string, input: UpdateCustomerInput) {
    const existing = await this.repo.findById(id, orgId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    if (input.name && input.name !== existing.name) {
      const duplicate = await this.repo.findByName(input.name, orgId);
      if (duplicate) {
        throw new ConflictError('A customer with this name already exists');
      }
    }

    const customer = await this.repo.update(id, orgId, input);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return serializeCustomer(customer);
  }

  async softDelete(id: string, orgId: string) {
    const customer = await this.repo.softDelete(id, orgId);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }
  }
}

function serializeCustomer(row: Record<string, unknown>): CustomerResponse {
  return {
    id: row.id as string,
    name: row.name as string,
    contactName: (row.contactName as string | null) ?? null,
    contactEmail: (row.contactEmail as string | null) ?? null,
    contactPhone: (row.contactPhone as string | null) ?? null,
    billingAddress: (row.billingAddress as string | null) ?? null,
    type: row.type as string,
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString(),
  };
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
