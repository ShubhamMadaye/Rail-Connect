import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard — Stats
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const [totalTrains, totalBookings, totalUsers, activeDelays] = await Promise.all([
      prisma.train.count({ where: { isActive: true } }),
      prisma.booking.count(),
      prisma.user.count({ where: { role: 'user' } }),
      prisma.delay.count({ where: { date: new Date().toISOString().split('T')[0], delayMinutes: { gt: 0 } } }),
    ]);
    const revenue = await prisma.booking.aggregate({
      where: { paymentStatus: 'Paid' },
      _sum: { totalFare: true },
    });
    res.json({ totalTrains, totalBookings, totalUsers, activeDelays, totalRevenue: revenue._sum.totalFare || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/revenue-analytics — Analytics data
router.get('/revenue-analytics', async (req: AuthRequest, res: Response) => {
  try {
    const [bookingsCount, totalPassengersResult] = await Promise.all([
      prisma.booking.count({ where: { paymentStatus: 'Paid' } }),
      prisma.booking.aggregate({
        where: { paymentStatus: 'Paid' },
        _sum: { totalPassengers: true }
      })
    ]);

    const totalPassengers = totalPassengersResult._sum.totalPassengers || 0;

    const revenueResult = await prisma.booking.aggregate({
      where: { paymentStatus: 'Paid' },
      _sum: { totalFare: true }
    });
    const totalRevenue = revenueResult._sum.totalFare || 0;
    const aov = bookingsCount > 0 ? totalRevenue / bookingsCount : 0;

    const classData = await prisma.booking.groupBy({
      by: ['seatClass'],
      _sum: { totalFare: true },
      _count: { id: true },
      where: { paymentStatus: 'Paid' }
    });

    const classRevenue = classData.map(c => ({
      class: c.seatClass,
      revenue: c._sum.totalFare || 0,
      tickets: c._count.id
    }));

    const trainRevenue = await prisma.booking.groupBy({
      by: ['trainId'],
      _sum: { totalFare: true },
      _count: { id: true },
      where: { paymentStatus: 'Paid' }
    });

    const trainIds = trainRevenue.map(t => t.trainId);
    const trains = await prisma.train.findMany({
      where: { id: { in: trainIds } }
    });

    const topTrains = trainRevenue.map(tr => {
      const train = trains.find(t => t.id === tr.trainId);
      return {
        trainId: tr.trainId,
        trainNumber: train?.trainNumber || 'N/A',
        name: train?.name || 'Unknown',
        type: train?.type || 'Express',
        revenue: tr._sum.totalFare || 0,
        bookingsCount: tr._count.id
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const routeData = await prisma.booking.groupBy({
      by: ['fromStation', 'toStation', 'trainId'],
      _sum: { totalPassengers: true },
      where: { status: 'Confirmed' }
    });

    const heatmapTrains = await prisma.train.findMany({
      where: { id: { in: routeData.map(r => r.trainId) } }
    });

    const routeHeatmap = routeData.map(r => {
      const train = heatmapTrains.find(t => t.id === r.trainId);
      const booked = r._sum.totalPassengers || 0;
      const capacity = train?.type === 'Local' ? 1000 : 5;
      const occupancyPercent = Math.min(100, Math.round((booked / capacity) * 100));

      let demandLabel = 'Low Demand';
      if (occupancyPercent >= 80) demandLabel = 'High Demand';
      else if (occupancyPercent >= 40) demandLabel = 'Medium Demand';

      return {
        from: r.fromStation,
        to: r.toStation,
        trainNumber: train?.trainNumber || 'N/A',
        trainName: train?.name || 'Unknown',
        occupancy: occupancyPercent,
        demand: demandLabel
      };
    }).sort((a, b) => b.occupancy - a.occupancy);

    const today = new Date();
    const trendData: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dateBookings = await prisma.booking.aggregate({
        where: { journeyDate: dateStr, paymentStatus: 'Paid' },
        _sum: { totalFare: true }
      });

      trendData.push({
        date: dateStr,
        revenue: dateBookings._sum.totalFare || 0
      });
    }

    res.json({
      totalRevenue,
      bookingsCount,
      totalPassengers,
      aov: Math.round(aov),
      classRevenue,
      topTrains,
      routeHeatmap,
      salesTrend: trendData
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/bookings — All bookings
router.get('/bookings', async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { user: { select: { name: true, email: true } }, train: true, passengers: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/delays — Set delay for a train
router.post('/delays', async (req: AuthRequest, res: Response) => {
  try {
    const { trainId, date, delayMinutes, reason } = req.body;
    if (!trainId || !date) return res.status(400).json({ error: 'trainId and date required' });

    const delay = await prisma.delay.upsert({
      where: { trainId_date: { trainId, date } },
      update: { delayMinutes: parseInt(delayMinutes) || 0, reason: reason || null },
      create: { trainId, date, delayMinutes: parseInt(delayMinutes) || 0, reason: reason || null },
      include: { train: true },
    });
    res.json({ delay, message: `Delay updated for ${delay.train.name}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/delays/:trainId/:date — Clear delay
router.delete('/delays/:trainId/:date', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.delay.update({
      where: { trainId_date: { trainId: req.params.trainId as string, date: req.params.date as string } },
      data: { delayMinutes: 0, reason: null },
    });
    res.json({ message: 'Delay cleared' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/trains — All trains
router.get('/trains', async (req: AuthRequest, res: Response) => {
  try {
    const trains = await prisma.train.findMany({
      include: { routes: { include: { station: true }, orderBy: { stopNumber: 'asc' } } },
      orderBy: { trainNumber: 'asc' },
    });
    res.json({ trains });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/trains/:id — Update train active status
router.patch('/trains/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.body;
    const train = await prisma.train.update({
      where: { id: req.params.id as string },
      data: { isActive },
    });
    res.json({ train });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/delays — All current delays
router.get('/delays', async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const delays = await prisma.delay.findMany({
      where: { date: today },
      include: { train: true },
      orderBy: { delayMinutes: 'desc' },
    });
    res.json({ delays, date: today });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
