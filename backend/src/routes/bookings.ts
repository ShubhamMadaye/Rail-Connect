import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import os from 'os';

const router = Router();
const prisma = new PrismaClient();

function generatePNR(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pnr = '';
  for (let i = 0; i < 10; i++) pnr += chars[Math.floor(Math.random() * chars.length)];
  return pnr;
}

function generateCoach(seatClass: string): string {
  const prefixes: Record<string, string> = {
    General: 'GN', Sleeper: 'S', '3AC': 'B', '2AC': 'A', '1AC': 'H',
  };
  const prefix = prefixes[seatClass] || 'S';
  return `${prefix}${Math.floor(Math.random() * 9) + 1}`;
}

function generateSeatNumbers(count: number, coach: string): string[] {
  const seats: string[] = [];
  let start = Math.floor(Math.random() * 60) + 1;
  for (let i = 0; i < count; i++) {
    seats.push(`${coach}-${start + i}`);
  }
  return seats;
}

// POST /api/bookings — Create booking
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { trainId, journeyDate, fromStation, toStation, seatClass, passengers } = req.body;

    if (!trainId || !journeyDate || !fromStation || !toStation || !seatClass || !passengers?.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const train = await prisma.train.findUnique({ where: { id: trainId } });
    if (!train) return res.status(404).json({ error: 'Train not found' });

    // Calculate fare
    const fromSt = await prisma.station.findUnique({ where: { code: fromStation } });
    const toSt = await prisma.station.findUnique({ where: { code: toStation } });
    if (!fromSt || !toSt) return res.status(404).json({ error: 'Station not found' });

    const fromRoute = await prisma.trainRoute.findUnique({ where: { trainId_stationId: { trainId, stationId: fromSt.id } } });
    const toRoute = await prisma.trainRoute.findUnique({ where: { trainId_stationId: { trainId, stationId: toSt.id } } });

    const dist = Math.abs((toRoute?.distanceFromOrigin || 100) - (fromRoute?.distanceFromOrigin || 0));
    const isLocal = train.type === 'Local';
    const baseFare = Math.max(dist * 0.8, isLocal ? 10 : 50);
    
    const defaultFareMap: Record<string, number> = {
      General: 0.5, Sleeper: 1.2, '3AC': 2.5, '2AC': 3.8, '1AC': 6.0,
    };
    const localFareMap: Record<string, number> = {
      'Second Class': 0.2, 'First Class': 1.5,
    };
    const fareMap = isLocal ? localFareMap : defaultFareMap;

    // Fetch existing bookings to compute occupancy and handle waitlisting
    const activeBookings = await prisma.booking.findMany({
      where: {
        trainId,
        journeyDate,
        seatClass,
        status: { in: ['Confirmed', 'WaitingList'] },
      },
    });

    const totalBookedSeats = activeBookings.reduce((sum, b) => {
      if (b.status === 'Confirmed') return sum + b.totalPassengers;
      return sum;
    }, 0);

    const capacityLimit = isLocal ? 1000 : 5; // High for local suburban trains, low (5) for easy waitlist testing
    const occupancyRate = totalBookedSeats / capacityLimit;

    // Dynamic Pricing calculation
    const basePassengerFare = Math.max(isLocal ? 5 : 50, Math.round(baseFare * (fareMap[seatClass] || (isLocal ? 0.2 : 1.2))));
    const multiplier = occupancyRate >= 0.8 ? 1.30 : (occupancyRate >= 0.5 ? 1.15 : 1.0);
    const perPassengerFare = Math.round(basePassengerFare * multiplier);
    const totalFare = perPassengerFare * passengers.length;

    const pnr = generatePNR();
    let status = 'Confirmed';
    let waitlistNumber: number | null = null;
    let coach = '';
    let seatNumbers: string[] = [];

    if (!isLocal && (totalBookedSeats + passengers.length > capacityLimit)) {
      status = 'WaitingList';
      const currentWaitlistedCount = activeBookings
        .filter(b => b.status === 'WaitingList')
        .reduce((sum, b) => sum + b.totalPassengers, 0);
      waitlistNumber = currentWaitlistedCount + 1;
      coach = 'WL';
      seatNumbers = passengers.map((_, i) => `WL-${currentWaitlistedCount + i + 1}`);
    } else {
      coach = isLocal ? 'UNRESERVED' : generateCoach(seatClass);
      seatNumbers = isLocal ? Array(passengers.length).fill('—') : generateSeatNumbers(passengers.length, coach);
    }

    const booking = await prisma.booking.create({
      data: {
        pnr,
        userId: req.user!.id,
        trainId,
        journeyDate,
        fromStation,
        toStation,
        seatClass,
        totalPassengers: passengers.length,
        totalFare,
        status,
        paymentStatus: 'Paid',
        coachNumber: coach,
        seatNumbers: JSON.stringify(seatNumbers),
        waitlistNumber,
        passengers: {
          create: passengers.map((p: any, i: number) => ({
            name: p.name,
            age: parseInt(p.age),
            gender: p.gender,
            seatNumber: seatNumbers[i],
          })),
        },
      },
      include: {
        passengers: true,
        train: { include: { routes: { include: { station: true }, orderBy: { stopNumber: 'asc' } } } },
      },
    });

    res.status(201).json({ booking, perPassengerFare });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/pnr/:pnr — Get by PNR (public)
router.get('/pnr/:pnr', async (req: any, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { pnr: req.params.pnr },
      include: {
        passengers: true,
        train: true,
        foodOrders: { include: { vendor: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found for PNR: ' + req.params.pnr });

    const today = new Date().toISOString().split('T')[0];
    const delay = await prisma.delay.findUnique({
      where: { trainId_date: { trainId: booking.trainId, date: booking.journeyDate } },
    });

    res.json({ booking: { ...booking, delay } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/my — User's bookings
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.id },
      include: { passengers: true, train: true, foodOrders: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id as string },
      include: {
        passengers: true,
        train: { include: { routes: { include: { station: true }, orderBy: { stopNumber: 'asc' } } } },
        foodOrders: { include: { vendor: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ booking });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bookings/:id — Cancel booking
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id as string } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (booking.status === 'Cancelled') return res.status(400).json({ error: 'Booking already cancelled' });

    const updated = await prisma.booking.update({
      where: { id: req.params.id as string },
      data: { status: 'Cancelled', paymentStatus: 'Refunded' },
    });
    res.json({ booking: updated, message: 'Booking cancelled successfully. Refund will be processed in 5-7 business days.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/pnr/:pnr/waitlist-prediction — Get waitlist probability
router.get('/pnr/:pnr/waitlist-prediction', async (req: any, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { pnr: req.params.pnr }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.status !== 'WaitingList') {
      return res.json({ waitlisted: false, probability: 100, message: 'Ticket is confirmed' });
    }

    const wl = booking.waitlistNumber || 1;
    let probability = 100;
    if (wl <= 3) {
      probability = 92 - (wl * 4);
    } else if (wl <= 10) {
      probability = 80 - ((wl - 3) * 5);
    } else {
      probability = Math.max(5, 45 - ((wl - 10) * 3));
    }

    // Adjust for days left before journey
    const today = new Date();
    const journey = new Date(booking.journeyDate);
    const diffTime = journey.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft > 7) {
      probability = Math.min(98, probability + 8);
    } else if (daysLeft <= 1) {
      probability = Math.max(2, probability - 15);
    }

    let message = 'High chance of confirmation';
    if (probability < 35) {
      message = 'Low chance of confirmation';
    } else if (probability < 75) {
      message = 'Medium chance of confirmation';
    }

    res.json({
      waitlisted: true,
      waitlistNumber: wl,
      probability: Math.round(probability),
      message
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/pnr/:pnr/validate — Validate PNR ticket
router.get('/pnr/:pnr/validate', async (req: any, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { pnr: req.params.pnr },
      include: {
        passengers: true,
        train: true
      }
    });

    if (!booking) {
      return res.json({ valid: false, message: 'Invalid ticket PNR code' });
    }

    res.json({
      valid: booking.status !== 'Cancelled',
      status: booking.status,
      pnr: booking.pnr,
      trainName: booking.train.name,
      trainNumber: booking.train.trainNumber,
      journeyDate: booking.journeyDate,
      fromStation: booking.fromStation,
      toStation: booking.toStation,
      seatClass: booking.seatClass,
      coachNumber: booking.coachNumber,
      seatNumbers: booking.seatNumbers ? JSON.parse(booking.seatNumbers) : [],
      passengers: booking.passengers,
      message: booking.status === 'Cancelled' ? 'Ticket is Cancelled' : 'Ticket is Active and Valid'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/system/config — Get system config (public)
router.get('/system/config', (req, res) => {
  try {
    const nets = os.networkInterfaces();
    let localIp = 'localhost';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          localIp = net.address;
          break;
        }
      }
    }
    res.json({ localIp });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
