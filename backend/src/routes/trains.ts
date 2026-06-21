import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

// GET /api/trains/live/:trainNumber
router.get('/live/:trainNumber', async (req: Request, res: Response) => {
  const trainNumber = req.params.trainNumber as string;
  const now = new Date();

  try {
    let queryTrainNumber = trainNumber;
    let startMinsOverride: number | null = null;

    if (trainNumber.includes('-')) {
      const parts = trainNumber.split('-');
      queryTrainNumber = parts[0];
      const timeStr = parts[1];
      if (timeStr && timeStr.length === 4) {
        const hh = parseInt(timeStr.slice(0, 2), 10);
        const mm = parseInt(timeStr.slice(2, 4), 10);
        startMinsOverride = hh * 60 + mm;
      }
    }

    const train = await prisma.train.findUnique({ where: { trainNumber: queryTrainNumber } });
    if (!train) return res.status(404).json({ error: 'Train not found' });

    // Get all sequential routes for the train
    const routes = await prisma.trainRoute.findMany({
      where: { trainId: train.id },
      include: { station: true },
      orderBy: { stopNumber: 'asc' },
    });

    if (routes.length === 0) {
      return res.status(400).json({ error: 'Train schedule route is not defined' });
    }

    // Helper functions for time conversion
    const parseTimeToMinutes = (timeStr: string | null): number => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const minutesToTimeStr = (totalMins: number): string => {
      const h = Math.floor((totalMins % 1440) / 60);
      const m = totalMins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Process scheduled times to absolute minutes from starting day midnight,
    // accounting for overnight runs that roll over midnight.
    let currentOffset = 0;
    let lastMinutes = 0;
    let processedRoutes = routes.map((r, idx) => {
      const arrTimeMin = r.arrivalTime ? parseTimeToMinutes(r.arrivalTime) : null;
      const depTimeMin = r.departureTime ? parseTimeToMinutes(r.departureTime) : null;

      let arrMinAbs = arrTimeMin;
      if (arrMinAbs !== null) {
        if (arrMinAbs < lastMinutes) {
          currentOffset += 1440; // Midnight rollover
        }
        arrMinAbs += currentOffset;
        lastMinutes = arrMinAbs;
      }

      let depMinAbs = depTimeMin;
      if (depMinAbs !== null) {
        if (depMinAbs < lastMinutes) {
          currentOffset += 1440; // Midnight rollover
        }
        depMinAbs += currentOffset;
        lastMinutes = depMinAbs;
      }

      return {
        route: r,
        arrMinAbs: arrMinAbs ?? depMinAbs ?? 0,
        depMinAbs: depMinAbs ?? arrMinAbs ?? 0,
        arrivalTime: r.arrivalTime,
        departureTime: r.departureTime
      };
    });

    if (startMinsOverride !== null && processedRoutes.length > 0) {
      const templateStartMins = processedRoutes[0].depMinAbs;
      const shiftMins = startMinsOverride - templateStartMins;

      processedRoutes = processedRoutes.map(pr => {
        const arrMinAbs = pr.arrMinAbs !== null ? pr.arrMinAbs + shiftMins : null;
        const depMinAbs = pr.depMinAbs !== null ? pr.depMinAbs + shiftMins : null;
        
        const arrivalTime = pr.arrivalTime ? minutesToTimeStr(parseTimeToMinutes(pr.arrivalTime) + shiftMins) : null;
        const departureTime = pr.departureTime ? minutesToTimeStr(parseTimeToMinutes(pr.departureTime) + shiftMins) : null;

        return {
          ...pr,
          arrMinAbs: arrMinAbs ?? depMinAbs ?? 0,
          depMinAbs: depMinAbs ?? arrMinAbs ?? 0,
          arrivalTime,
          departureTime
        };
      });
    }

    // Fetch delay records for today and yesterday to handle active overnight runs
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayMidnight = new Date(todayMidnight);
    yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);

    const todayStr = now.toISOString().split('T')[0];
    const yesterdayStr = yesterdayMidnight.toISOString().split('T')[0];

    const delays = await prisma.delay.findMany({
      where: {
        trainId: train.id,
        date: { in: [todayStr, yesterdayStr] }
      }
    });

    const getDelayForDate = (dateStr: string) => {
      return delays.find(d => d.date === dateStr) || null;
    };

    const firstStopDep = processedRoutes[0].depMinAbs;
    const lastStopArr = processedRoutes[processedRoutes.length - 1].arrMinAbs;

    // Evaluate trip states for both yesterday's and today's runs
    const getJourneyStatus = (startDate: Date, dateStr: string) => {
      const dateDelay = getDelayForDate(dateStr);
      const dMins = dateDelay ? dateDelay.delayMinutes : 0;
      
      const startMs = startDate.getTime() + firstStopDep * 60 * 1000;
      const endMs = startDate.getTime() + (lastStopArr + dMins) * 60 * 1000;
      const nowMs = now.getTime();

      let journeyState: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' = 'ACTIVE';
      if (nowMs < startMs) {
        journeyState = 'UPCOMING';
      } else if (nowMs > endMs) {
        journeyState = 'COMPLETED';
      }

      return {
        journeyState,
        startMs,
        endMs,
        delayMins: dMins,
        delayReason: dateDelay ? dateDelay.reason : null,
        timeFromStartMin: (nowMs - startDate.getTime()) / (60 * 1000)
      };
    };

    let selectedRun = getJourneyStatus(todayMidnight, todayStr);
    let selectedStartDate = todayMidnight;
    let selectedDateStr = todayStr;

    const yesterdayRun = getJourneyStatus(yesterdayMidnight, yesterdayStr);
    if (yesterdayRun.journeyState === 'ACTIVE') {
      selectedRun = yesterdayRun;
      selectedStartDate = yesterdayMidnight;
      selectedDateStr = yesterdayStr;
    }

    const { journeyState, timeFromStartMin, delayMins, delayReason } = selectedRun;
    const totalStops = processedRoutes.length;

    let currentIndex = 0;
    let nextIndex = 0;
    let minutesToNext = 0;
    let statusText = '';
    let haltedAtIdx: number | null = null;

    if (journeyState === 'UPCOMING') {
      currentIndex = 0;
      nextIndex = 0;
      const originRoute = processedRoutes[0];
      const startMs = selectedStartDate.getTime() + originRoute.depMinAbs * 60 * 1000;
      minutesToNext = Math.ceil((startMs - now.getTime()) / (60 * 1000));
      
      statusText = `Scheduled to depart from ${originRoute.route.station.name} at ${originRoute.route.departureTime}.`;
      if (delayMins > 0) {
        statusText += ` Expected departure delayed to ${minutesToTimeStr(originRoute.depMinAbs + delayMins)} (${delayMins}m delay).`;
      } else {
        statusText += ` On Time.`;
      }
    } else if (journeyState === 'COMPLETED') {
      currentIndex = totalStops - 1;
      nextIndex = totalStops - 1;
      minutesToNext = 0;
      const destRoute = processedRoutes[totalStops - 1];
      statusText = `Completed journey. Arrived at ${destRoute.route.station.name} at ${minutesToTimeStr(destRoute.arrMinAbs + delayMins)}.`;
    } else {
      // ACTIVE state
      let found = false;

      for (let i = 0; i < totalStops; i++) {
        const routeStop = processedRoutes[i];
        const expectedArr = routeStop.arrMinAbs + delayMins;
        const expectedDep = routeStop.depMinAbs + delayMins;

        const isFirst = i === 0;
        const isLast = i === totalStops - 1;

        if (isFirst) {
          if (timeFromStartMin < expectedDep) {
            currentIndex = 0;
            nextIndex = 1;
            haltedAtIdx = 0;
            minutesToNext = Math.ceil(expectedDep - timeFromStartMin);
            statusText = `Halted at ${routeStop.route.station.name} (Origin). Expected departure in ${minutesToNext} mins.`;
            found = true;
            break;
          }
        } else if (isLast) {
          if (timeFromStartMin >= expectedArr) {
            currentIndex = totalStops - 1;
            nextIndex = totalStops - 1;
            haltedAtIdx = totalStops - 1;
            minutesToNext = 0;
            statusText = `Arrived at ${routeStop.route.station.name} (Destination).`;
            found = true;
            break;
          }
        } else {
          if (timeFromStartMin >= expectedArr && timeFromStartMin < expectedDep) {
            currentIndex = i;
            nextIndex = Math.min(totalStops - 1, i + 1);
            haltedAtIdx = i;
            minutesToNext = Math.ceil(expectedDep - timeFromStartMin);
            const haltDuration = routeStop.route.haltMinutes;
            statusText = `Halted at ${routeStop.route.station.name} (Platform ${routeStop.route.platform}). Expected departure in ${minutesToNext} mins.`;
            found = true;
            break;
          }
        }

        if (i < totalStops - 1) {
          const nextStop = processedRoutes[i + 1];
          const currentExpectedDep = expectedDep;
          const nextExpectedArr = nextStop.arrMinAbs + delayMins;

          if (timeFromStartMin >= currentExpectedDep && timeFromStartMin < nextExpectedArr) {
            currentIndex = i;
            nextIndex = i + 1;
            minutesToNext = Math.ceil(nextExpectedArr - timeFromStartMin);
            statusText = `Running between ${routeStop.route.station.name} and ${nextStop.route.station.name}. Arriving at ${nextStop.route.station.name} in ${minutesToNext} mins.`;
            found = true;
            break;
          }
        }
      }

      if (!found) {
        currentIndex = 0;
        nextIndex = 1;
        minutesToNext = 5;
        statusText = `Train is active on route.`;
      }
    }

    const finalStations = processedRoutes.map((pr, idx) => {
      let isHalted = haltedAtIdx === idx;
      let isPassed = false;
      let isUpcoming = false;

      if (journeyState === 'UPCOMING') {
        isUpcoming = true;
      } else if (journeyState === 'COMPLETED') {
        isPassed = idx < totalStops - 1;
        isHalted = idx === totalStops - 1;
      } else {
        if (idx < currentIndex) {
          isPassed = true;
        } else if (idx === currentIndex) {
          if (haltedAtIdx !== null) {
            isHalted = true;
          } else {
            isPassed = true;
          }
        } else {
          isUpcoming = true;
        }
      }

      const expectedArr = pr.arrivalTime ? minutesToTimeStr(pr.arrMinAbs + delayMins) : null;
      const expectedDep = pr.departureTime ? minutesToTimeStr(pr.depMinAbs + delayMins) : null;

      return {
        stationName: pr.route.station.name,
        stationCode: pr.route.station.code,
        arrivalTime: pr.arrivalTime,
        departureTime: pr.departureTime,
        expectedArrivalTime: expectedArr,
        expectedDepartureTime: expectedDep,
        distanceKm: pr.route.distanceFromOrigin,
        platform: pr.route.platform,
        latitude: pr.route.station.latitude,
        longitude: pr.route.station.longitude,
        isHalted,
        isPassed,
        isUpcoming
      };
    });

    res.json({
      source: 'SCHEDULE_AWARE_TRACKING_ENGINE',
      trainId: train.id,
      trainNumber: trainNumber,
      trainName: train.name,
      type: train.type,
      delayMinutes: delayMins,
      delayReason: delayReason || 'Traffic Congestion',
      status: statusText,
      journeyState,
      journeyDate: selectedDateStr,
      currentIndex,
      nextIndex,
      minutesToNext,
      stations: finalStations
    });

  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch live status', message: error.message });
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
