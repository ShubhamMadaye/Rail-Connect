import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

// GET /api/trains/live/:trainNumber
router.get('/live/:trainNumber', async (req: Request, res: Response) => {
  const trainNumber = req.params.trainNumber as string;
  const date = new Date().toISOString().split('T')[0];

  try {
    const train = await prisma.train.findUnique({ where: { trainNumber } });
    if (!train) return res.status(404).json({ error: 'Train not found' });

    // Fetch delay records for today
    const dbDelays = await prisma.delay.findMany({
      where: { trainId: train.id, date }
    });
    const dbDelay = dbDelays[0];

    // Get all sequential routes for the train
    const routes = await prisma.trainRoute.findMany({
      where: { trainId: train.id },
      include: { station: true },
      orderBy: { stopNumber: 'asc' },
    });

    if (routes.length === 0) {
      return res.status(400).json({ error: 'Train schedule route is not defined' });
    }

    // Dynamic running progress simulation based on current system minute
    const now = new Date();
    const totalStops = routes.length;
    // Map current minute block to simulate train progressing between nodes
    const progressSeed = (now.getHours() * 60 + now.getMinutes()) % 60; // 0 to 59 minutes
    const currentIndex = Math.min(totalStops - 1, Math.floor((progressSeed / 60) * totalStops));
    const nextIndex = Math.min(totalStops - 1, currentIndex + 1);
    const minutesToNext = Math.max(1, 10 - (progressSeed % 10)); // simulated countdown to next stop

    const statusStr = dbDelay && dbDelay.delayMinutes > 0 
      ? `Delayed by ${dbDelay.delayMinutes}m : ${dbDelay.reason || 'Traffic Congestion'}` 
      : 'On Time';

    res.json({
      source: 'DATABASE_TRACKING_ENGINE',
      trainId: train.id,
      trainNumber: train.trainNumber,
      trainName: train.name,
      delayMinutes: dbDelay ? dbDelay.delayMinutes : 0,
      status: statusStr,
      currentIndex,
      nextIndex,
      minutesToNext,
      stations: routes.map((r, idx) => ({
        stationName: r.station.name,
        stationCode: r.station.code,
        arrivalTime: r.arrivalTime,
        departureTime: r.departureTime,
        distanceKm: r.distanceFromOrigin,
        platform: r.platform,
        isHalted: idx === currentIndex,
        isPassed: idx < currentIndex,
        isUpcoming: idx > currentIndex
      }))
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch live status' });
  }
});

// GET /api/trains/search?from=&to=&date=&type=
router.get('/search', async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const date = req.query.date as string | undefined;
    const type = req.query.type as string | undefined;

    if (!from || !to) return res.status(400).json({ error: 'from and to station codes required' });

    // Find trains that have both from and to stations in their routes
    const fromStation = await prisma.station.findUnique({ where: { code: from } });
    const toStation = await prisma.station.findUnique({ where: { code: to } });
    if (!fromStation) return res.status(404).json({ error: `Station not found: ${from}` });
    if (!toStation) return res.status(404).json({ error: `Station not found: ${to}` });

    const trainsWithFrom = await prisma.trainRoute.findMany({
      where: { stationId: fromStation.id },
      select: { trainId: true, stopNumber: true, departureTime: true },
    });

    const trainsWithTo = await prisma.trainRoute.findMany({
      where: { stationId: toStation.id },
      select: { trainId: true, stopNumber: true, arrivalTime: true },
    });

    const fromMap = new Map(trainsWithFrom.map(r => [r.trainId, r]));
    const toMap = new Map(trainsWithTo.map(r => [r.trainId, r]));

    const validTrainIds = [...fromMap.keys()].filter(id => {
      const fromStop = fromMap.get(id);
      const toStop = toMap.get(id);
      return toStop && fromStop && fromStop.stopNumber < toStop.stopNumber;
    });

    if (validTrainIds.length === 0) return res.json({ trains: [] });

    const whereClause: any = { id: { in: validTrainIds }, isActive: true };
    if (type) whereClause.type = type;

    const trains = await prisma.train.findMany({
      where: whereClause,
      include: {
        routes: {
          include: { station: true },
          orderBy: { stopNumber: 'asc' },
        },
        delays: date ? { where: { date } } : { take: 0 },
      },
    });

    // Fetch bookings on the requested travel date to compute occupancy
    const bookingsForDate = date ? await prisma.booking.findMany({
      where: {
        trainId: { in: validTrainIds },
        journeyDate: date,
        status: { in: ['Confirmed', 'WaitingList'] }
      }
    }) : [];

    const result = trains.map(train => {
      const fromRoute = train.routes.find(r => r.stationId === fromStation.id);
      const toRoute = train.routes.find(r => r.stationId === toStation.id);
      const delay = train.delays[0];

      const defaultFareMap: Record<string, number> = {
        General: 0.5, Sleeper: 1.2, '3AC': 2.5, '2AC': 3.8, '1AC': 6.0,
      };
      const localFareMap: Record<string, number> = {
        'Second Class': 0.2, 'First Class': 1.5,
      };

      const isLocal = train.type === 'Local';
      const fareMap = isLocal ? localFareMap : defaultFareMap;

      const dist = (toRoute?.distanceFromOrigin || 0) - (fromRoute?.distanceFromOrigin || 0);
      const baseFare = Math.max(dist * 0.8, isLocal ? 10 : 50);

      const faresList: Record<string, number> = {};
      const baseFaresList: Record<string, number> = {};
      const seatsLeftList: Record<string, number> = {};

      const trainBookings = bookingsForDate.filter(b => b.trainId === train.id);

      Object.keys(fareMap).forEach(k => {
        const classBookings = trainBookings.filter(b => b.seatClass === k);
        const bookedSeats = classBookings.reduce((sum, b) => {
          if (b.status === 'Confirmed') return sum + b.totalPassengers;
          return sum;
        }, 0);

        const limit = isLocal ? 1000 : 5;
        seatsLeftList[k] = Math.max(0, limit - bookedSeats);

        const basePassengerFare = Math.max(isLocal ? 5 : 50, Math.round(baseFare * fareMap[k]));
        baseFaresList[k] = basePassengerFare;

        // Occupancy surcharge
        const occupancyRate = bookedSeats / limit;
        const multiplier = occupancyRate >= 0.8 ? 1.30 : (occupancyRate >= 0.5 ? 1.15 : 1.0);
        faresList[k] = Math.round(basePassengerFare * multiplier);
      });

      return {
        id: train.id,
        trainNumber: train.trainNumber,
        name: train.name,
        type: train.type,
        fromStation: { code: from, name: fromStation.name, city: fromStation.city },
        toStation: { code: to, name: toStation.name, city: toStation.city },
        departure: fromRoute?.departureTime,
        arrival: toRoute?.arrivalTime,
        departureStop: fromRoute?.stopNumber,
        alignment: toRoute?.stopNumber,
        platform: fromRoute?.platform,
        distanceKm: dist,
        delayMinutes: delay?.delayMinutes || 0,
        delayReason: delay?.reason || null,
        fares: faresList,
        baseFares: baseFaresList,
        seatsLeft: seatsLeftList,
        totalStops: train.routes.length,
        routes: train.routes.map(r => ({
          stationName: r.station.name,
          stationCode: r.station.code,
          arrivalTime: r.arrivalTime,
          departureTime: r.departureTime,
          distanceKm: r.distanceFromOrigin,
          platform: r.platform,
          stopNumber: r.stopNumber,
        })),
      };
    });

    res.json({ trains: result, count: result.length, from: fromStation, to: toStation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trains/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const trainId = req.params.id as string;
    const train = await prisma.train.findUnique({
      where: { id: trainId },
      include: {
        routes: {
          include: { station: true },
          orderBy: { stopNumber: 'asc' },
        },
      },
    });
    if (!train) return res.status(404).json({ error: 'Train not found' });

    const today = new Date().toISOString().split('T')[0];
    const delay = await prisma.delay.findUnique({ where: { trainId_date: { trainId: train.id, date: today } } });

    res.json({ ...train, delay: delay || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trains
router.get('/', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const where: any = { isActive: true };
    if (type) where.type = type;
    const trains = await prisma.train.findMany({ where, orderBy: { trainNumber: 'asc' } });
    res.json({ trains });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trains/stations/all
router.get('/stations/all', async (req: Request, res: Response) => {
  try {
    const stations = await prisma.station.findMany({ orderBy: { name: 'asc' } });
    res.json({ stations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trains/stations/routes — List of all stations and their reachable routes
router.get('/stations/routes', async (req: Request, res: Response) => {
  try {
    const stations = await prisma.station.findMany({
      orderBy: { name: 'asc' },
    });

    const today = new Date().toISOString().split('T')[0];
    const trainRoutes = await prisma.trainRoute.findMany({
      include: {
        train: {
          include: {
            routes: {
              include: { station: true },
              orderBy: { stopNumber: 'asc' }
            },
            delays: {
              where: { date: today }
            }
          }
        }
      },
      orderBy: { stopNumber: 'asc' }
    });

    // Map stations to their passing trains and destinations
    const stationRoutesMap = stations.map(station => {
      // Find all routes that pass through this station
      const passing = trainRoutes.filter(tr => tr.stationId === station.id);
      
      const routes = passing.map(tr => {
        const train = tr.train;
        const currentStopNumber = tr.stopNumber;
        const delay = train.delays[0];
        
        // Destinations are all stops in the train's route after this station
        const destinations = train.routes
          .filter(r => r.stopNumber > currentStopNumber)
          .map(r => ({
            stationName: r.station.name,
            stationCode: r.station.code,
            city: r.station.city,
            arrivalTime: r.arrivalTime,
            departureTime: r.departureTime,
            distanceKm: r.distanceFromOrigin - tr.distanceFromOrigin,
          }));

        return {
          trainId: train.id,
          trainName: train.name,
          trainNumber: train.trainNumber,
          type: train.type,
          arrivalTime: tr.arrivalTime,
          departureTime: tr.departureTime,
          stopNumber: tr.stopNumber,
          platform: tr.platform,
          delayMinutes: delay?.delayMinutes || 0,
          delayReason: delay?.reason || null,
          destinations,
        };
      });

      return {
        id: station.id,
        name: station.name,
        code: station.code,
        city: station.city,
        passingTrainsCount: routes.length,
        routes,
      };
    });

    res.json({ stations: stationRoutesMap });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trains/:id/predict-delay — Compute data-driven delay prediction
router.get('/:id/predict-delay', async (req: Request, res: Response) => {
  try {
    const trainId = req.params.id as string;
    const delays = await prisma.delay.findMany({
      where: { trainId }
    });

    if (!delays.length) {
      // Default fallback if no history
      return res.json({
        trainId,
        predictedDelayMins: 0,
        delayProbability: 0,
        riskFactor: 'Low',
        historicalRunsCount: 0
      });
    }

    const totalDelays = delays.reduce((sum, d) => sum + d.delayMinutes, 0);
    const avgDelay = totalDelays / delays.length;
    const delayedRuns = delays.filter(d => d.delayMinutes > 0).length;
    const delayProb = (delayedRuns / delays.length) * 100;

    let riskFactor = 'Low';
    if (delayProb > 60 || avgDelay > 20) {
      riskFactor = 'High';
    } else if (delayProb > 30 || avgDelay > 10) {
      riskFactor = 'Medium';
    }

    res.json({
      trainId,
      predictedDelayMins: Math.round(avgDelay),
      delayProbability: Math.round(delayProb),
      riskFactor,
      historicalRunsCount: delays.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
