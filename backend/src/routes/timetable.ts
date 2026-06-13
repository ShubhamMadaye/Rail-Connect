import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/timetable?type=&date=
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, date } = req.query as any;
    const today = date || new Date().toISOString().split('T')[0];
    const where: any = { isActive: true };
    if (type && type !== 'All') where.type = type;

    const trains = await prisma.train.findMany({
      where,
      include: {
        routes: {
          include: { station: true },
          orderBy: { stopNumber: 'asc' },
        },
        delays: { where: { date: today } },
      },
      orderBy: { trainNumber: 'asc' },
    });

    const result = trains.map(train => {
      const firstStop = train.routes[0];
      const lastStop = train.routes[train.routes.length - 1];
      const delay = train.delays[0];
      return {
        id: train.id,
        trainNumber: train.trainNumber,
        name: train.name,
        type: train.type,
        from: firstStop?.station?.city || train.fromStation,
        to: lastStop?.station?.city || train.toStation,
        fromCode: firstStop?.station?.code || train.fromStation,
        toCode: lastStop?.station?.code || train.toStation,
        departure: firstStop?.departureTime,
        arrival: lastStop?.arrivalTime,
        totalStops: train.routes.length,
        delayMinutes: delay?.delayMinutes || 0,
        delayReason: delay?.reason || null,
        isOnTime: !delay || delay.delayMinutes === 0,
      };
    });

    res.json({ timetable: result, date: today });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/delays — Current delays
router.get('/delays', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const delays = await prisma.delay.findMany({
      where: { date: today, delayMinutes: { gt: 0 } },
      include: { train: true },
      orderBy: { delayMinutes: 'desc' },
    });
    res.json({ delays, date: today });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
