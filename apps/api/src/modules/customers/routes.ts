import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getParam, getActor } from '../../lib/request.js';
import { CustomerService, NotFoundError, ConflictError } from './service.js';
import { createCustomerSchema, updateCustomerSchema } from './dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';

const router: RouterType = Router();
const customerService = new CustomerService();

router.get('/customers', requireAuth, requireCapability('customer.read'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const result = await customerService.list(getActor(req).orgId, page);
    res.json(result);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/customers/:id', requireAuth, requireCapability('customer.read'), async (req, res) => {
  try {
    const customer = await customerService.getById(getParam(req, 'id'), getActor(req).orgId);
    res.json({ data: customer });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/customers', requireAuth, requireCapability('customer.create'), async (req, res) => {
  try {
    const input = createCustomerSchema.parse(req.body);
    const customer = await customerService.create(input, getActor(req).orgId, getActor(req).userId);
    res.status(201).json({ data: customer });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.put('/customers/:id', requireAuth, requireCapability('customer.update'), async (req, res) => {
  try {
    const input = updateCustomerSchema.parse(req.body);
    const customer = await customerService.update(getParam(req, 'id'), getActor(req).orgId, input, getActor(req).userId);
    res.json({ data: customer });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.delete('/customers/:id', requireAuth, requireCapability('customer.delete'), async (req, res) => {
  try {
    await customerService.softDelete(getParam(req, 'id'), getActor(req).orgId, getActor(req).userId);
    res.status(204).send();
  } catch (err) {
    nextError(err, req, res);
  }
});

function nextError(err: unknown, _req: Request, res: Response) {
  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: err.message, trace_id: '' },
    });
  } else if (err instanceof ConflictError) {
    res.status(409).json({
      error: { code: 'CONFLICT', message: err.message, trace_id: '' },
    });
  } else {
    throw err;
  }
}

export default router;
