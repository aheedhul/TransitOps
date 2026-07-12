import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getParam, getActor } from '../../lib/request.js';
import { ExpenseService, NotFoundError } from './service.js';
import { createExpenseSchema, updateExpenseSchema } from './dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';

const router: RouterType = Router();
const expenseService = new ExpenseService();

router.get('/expenses/rollup/:vehicleId', requireAuth, requireCapability('reports.read'), async (req, res) => {
  try {
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    const result = await expenseService.getRollup(
      getActor(req).orgId,
      getParam(req, 'vehicleId'),
      startDate,
      endDate,
    );
    res.json({ data: result });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/expenses/:id', requireAuth, requireCapability('maintenance.read'), async (req, res) => {
  try {
    const row = await expenseService.getById(getParam(req, 'id'), getActor(req).orgId);
    res.json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/expenses', requireAuth, requireCapability('maintenance.read'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const vehicleId = req.query.vehicle_id as string | undefined;
    const result = await expenseService.list(getActor(req).orgId, vehicleId, page);
    res.json(result);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/expenses', requireAuth, requireCapability('expense.create'), async (req, res) => {
  try {
    const input = createExpenseSchema.parse(req.body);
    const row = await expenseService.create(input, getActor(req).orgId, getActor(req).userId);
    res.status(201).json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.put('/expenses/:id', requireAuth, requireCapability('expense.create'), async (req, res) => {
  try {
    const input = updateExpenseSchema.parse(req.body);
    const row = await expenseService.update(getParam(req, 'id'), getActor(req).orgId, input, getActor(req).userId);
    res.json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.delete('/expenses/:id', requireAuth, requireCapability('expense.create'), async (req, res) => {
  try {
    await expenseService.softDelete(getParam(req, 'id'), getActor(req).orgId, getActor(req).userId);
    res.status(204).send();
  } catch (err) {
    nextError(err, req, res);
  }
});

function nextError(err: unknown, _req: Request, res: Response) {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message, trace_id: '' } });
  } else {
    throw err;
  }
}

export default router;
