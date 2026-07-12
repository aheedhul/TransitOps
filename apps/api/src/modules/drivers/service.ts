import { DriverRepository } from './repository.js';
import type { CreateDriverInput, UpdateDriverInput, DriverResponse } from './dto.js';

const CONTACT_VISIBLE_ROLES = new Set(['admin', 'fleet_manager', 'safety_officer']);

export class DriverService {
  constructor(private readonly repo: DriverRepository = new DriverRepository()) {}

  async list(orgId: string, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.repo.findAll(orgId, pageSize, offset),
      this.repo.count(orgId),
    ]);
    return {
      data: rows.map((r) => serializeDriver(r)),
      meta: {
        total,
        page,
        page_size: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: string, orgId: string, userId: string, role: string) {
    const driver = await this.repo.findById(id, orgId);
    if (!driver) {
      throw new NotFoundError('Driver not found');
    }
    return serializeDriver(driver, userId, role);
  }

  async create(input: CreateDriverInput, orgId: string) {
    const existing = await this.repo.findByLicenseNumber(input.licenseNumber, orgId);
    if (existing) {
      throw new ConflictError('A driver with this license number already exists');
    }

    const driver = await this.repo.create({
      ...input,
      organizationId: orgId,
    });

    return serializeDriver(driver);
  }

  async update(id: string, orgId: string, input: UpdateDriverInput, role: string) {
    const existing = await this.repo.findById(id, orgId);
    if (!existing) {
      throw new NotFoundError('Driver not found');
    }

    if (input.licenseNumber && input.licenseNumber !== existing.licenseNumber) {
      const duplicate = await this.repo.findByLicenseNumber(input.licenseNumber, orgId);
      if (duplicate) {
        throw new ConflictError('A driver with this license number already exists');
      }
    }

    if (input.status !== undefined && role !== 'admin') {
      throw new ForbiddenError('Only admins can change driver status');
    }

    const driver = await this.repo.update(id, orgId, input);
    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    return serializeDriver(driver);
  }

  async softDelete(id: string, orgId: string) {
    const driver = await this.repo.softDelete(id, orgId);
    if (!driver) {
      throw new NotFoundError('Driver not found');
    }
  }
}

function serializeDriver(
  row: Record<string, unknown>,
  userId?: string,
  role?: string,
): DriverResponse {
  const canViewContact =
    (role != null && CONTACT_VISIBLE_ROLES.has(role)) ||
    (userId != null && (row.userId as string | null) === userId);

  return {
    id: row.id as string,
    name: row.name as string,
    licenseNumber: row.licenseNumber as string,
    licenseCategory: row.licenseCategory as string,
    licenseExpiryDate: row.licenseExpiryDate as string,
    contactNumber: canViewContact ? (row.contactNumber as string) : null,
    safetyScore: row.safetyScore as string,
    overallScore: row.overallScore as string,
    status: row.status as string,
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

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
