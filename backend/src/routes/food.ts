import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/food/vendors — All vendors
router.get('/vendors', async (req: any, res: Response) => {
  try {
    const vendors = await prisma.foodVendor.findMany({
      include: {
        station: true,
        menuItems: { where: { isAvailable: true } },
      },
    });
    res.json({ vendors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/food/vendors/:stationId — Vendors at a station
router.get('/vendors/station/:stationCode', async (req: any, res: Response) => {
  try {
    const station = await prisma.station.findUnique({ where: { code: req.params.stationCode } });
    if (!station) return res.status(404).json({ error: 'Station not found' });

    const vendors = await prisma.foodVendor.findMany({
      where: { stationId: station.id, isOpen: true },
      include: { menuItems: { where: { isAvailable: true } } },
    });
    res.json({ vendors, station });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/food/menu/:vendorId
router.get('/menu/:vendorId', async (req: any, res: Response) => {
  try {
    const vendor = await prisma.foodVendor.findUnique({
      where: { id: req.params.vendorId },
      include: {
        menuItems: { where: { isAvailable: true }, orderBy: { category: 'asc' } },
        station: true,
      },
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ vendor });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/food/order — Place food order
router.post('/order', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, vendorId, items, coachSeat } = req.body;
    // items: [{ foodItemId, quantity, name, price }]

    if (!bookingId || !vendorId || !items?.length) {
      return res.status(400).json({ error: 'bookingId, vendorId and items are required' });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    const totalAmount = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    const order = await prisma.foodOrder.create({
      data: {
        bookingId,
        vendorId,
        items: JSON.stringify(items),
        totalAmount,
        status: 'Placed',
        coachSeat: coachSeat || booking.coachNumber,
      },
      include: { vendor: true },
    });

    res.status(201).json({ order, message: 'Food order placed successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/food/order/:id — Track food order
router.get('/order/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.foodOrder.findUnique({
      where: { id: req.params.id as string },
      include: { vendor: true, booking: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Validate resource ownership
    if (order.booking.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Simulate status progression
    const createdAt = new Date(order.createdAt);
    const now = new Date();
    const minutesElapsed = Math.floor((now.getTime() - createdAt.getTime()) / 60000);

    let currentStatus = order.status;
    if (minutesElapsed >= 20 && order.status === 'OutForDelivery') currentStatus = 'Delivered';
    else if (minutesElapsed >= 10 && order.status === 'Preparing') currentStatus = 'OutForDelivery';
    else if (minutesElapsed >= 3 && order.status === 'Placed') currentStatus = 'Preparing';

    if (currentStatus !== order.status) {
      await prisma.foodOrder.update({ where: { id: order.id }, data: { status: currentStatus } });
    }

    res.json({ order: { ...order, status: currentStatus } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/food/orders/booking/:bookingId — Orders for a booking
router.get('/orders/booking/:bookingId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId as string } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Validate resource ownership
    if (booking.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orders = await prisma.foodOrder.findMany({
      where: { bookingId: req.params.bookingId as string },
      include: { vendor: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
