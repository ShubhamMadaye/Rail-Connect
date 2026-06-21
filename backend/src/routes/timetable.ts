import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/timetable?type=&date=
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, date } = req.query as any;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const today = date || todayStr;

    // Convert date string (YYYY-MM-DD) to midnight date object
    const [year, month, day] = today.split('-').map(Number);
    const targetMidnight = new Date(year, month - 1, day);

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

    const result = trains.flatMap(train => {
      const routesCount = train.routes.length;
      if (routesCount === 0) return [];

      const delay = train.delays[0];
      const delayMins = delay?.delayMinutes || 0;

      if (train.type !== 'Local') {
        const firstStop = train.routes[0];
        const lastStop = train.routes[routesCount - 1];

        // Calculate sequential absolute minutes from start day midnight
        let currentOffset = 0;
        let lastMinutes = 0;
        const processedRoutes = train.routes.map((r, idx) => {
          const arrTimeMin = r.arrivalTime ? parseTimeToMinutes(r.arrivalTime) : null;
          const depTimeMin = r.departureTime ? parseTimeToMinutes(r.departureTime) : null;

          let arrMinAbs = arrTimeMin;
          if (arrMinAbs !== null) {
            if (arrMinAbs < lastMinutes) currentOffset += 1440;
            arrMinAbs += currentOffset;
            lastMinutes = arrMinAbs;
          }

          let depMinAbs = depTimeMin;
          if (depMinAbs !== null) {
            if (depMinAbs < lastMinutes) currentOffset += 1440;
            depMinAbs += currentOffset;
            lastMinutes = depMinAbs;
          }

          return {
            arrMinAbs: arrMinAbs ?? depMinAbs ?? 0,
            depMinAbs: depMinAbs ?? arrMinAbs ?? 0,
          };
        });

        const firstStopDep = processedRoutes[0].depMinAbs;
        const lastStopArr = processedRoutes[routesCount - 1].arrMinAbs;

        // Define absolute timestamps in milliseconds
        const startMs = targetMidnight.getTime() + firstStopDep * 60 * 1000;
        const endMs = targetMidnight.getTime() + (lastStopArr + delayMins) * 60 * 1000;
        const nowMs = now.getTime();

        let journeyState: 'UPCOMING' | 'RUNNING' | 'COMPLETED' = 'RUNNING';
        let countdownMinutes = 0;

        if (nowMs < startMs) {
          journeyState = 'UPCOMING';
          countdownMinutes = Math.ceil((startMs - nowMs) / (60 * 1000));
        } else if (nowMs > endMs) {
          journeyState = 'COMPLETED';
        }

        // Calculate current location bounds if RUNNING
        let currentBounds = null;
        if (journeyState === 'RUNNING') {
          const timeFromStartMin = (nowMs - targetMidnight.getTime()) / (60 * 1000);
          let foundIndex = 0;

          for (let i = 0; i < routesCount; i++) {
            const routeStop = processedRoutes[i];
            const expArr = routeStop.arrMinAbs + delayMins;
            const expDep = routeStop.depMinAbs + delayMins;

            if (i === 0) {
              if (timeFromStartMin < expDep) {
                foundIndex = 0;
                break;
              }
            } else if (i === routesCount - 1) {
              if (timeFromStartMin >= expArr) {
                foundIndex = routesCount - 1;
                break;
              }
            } else {
              if (timeFromStartMin >= expArr && timeFromStartMin < expDep) {
                foundIndex = i;
                break;
              }
            }

            if (i < routesCount - 1) {
              const nextStop = processedRoutes[i + 1];
              if (timeFromStartMin >= expDep && timeFromStartMin < nextStop.arrMinAbs + delayMins) {
                foundIndex = i;
                break;
              }
            }
          }

          const nextIdx = Math.min(routesCount - 1, foundIndex + 1);
          const expectedArr = processedRoutes[nextIdx].arrMinAbs + delayMins;
          const minutesToNext = Math.max(1, Math.ceil(expectedArr - timeFromStartMin));

          currentBounds = {
            currentStationName: train.routes[foundIndex]?.station?.name || train.fromStation,
            currentStationCode: train.routes[foundIndex]?.station?.code || train.fromStation,
            nextStationName: train.routes[nextIdx]?.station?.name || train.toStation,
            nextStationCode: train.routes[nextIdx]?.station?.code || train.toStation,
            platform: train.routes[foundIndex]?.platform || "1",
            minutesToNext,
          };
        }

        return [{
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
          expectedDeparture: minutesToTimeStr(firstStopDep + delayMins),
          expectedArrival: minutesToTimeStr(lastStopArr + delayMins),
          totalStops: routesCount,
          delayMinutes: delayMins,
          delayReason: delay?.reason || null,
          isOnTime: delayMins === 0,
          journeyState,
          countdownMinutes,
          currentBounds,
        }];
      } else {
        // Dynamic Local Service Generation Engine
        const LOCAL_TEMPLATES: Record<string, { startTime: string; endTime: string; frequency: number }> = {
          WR9001: { startTime: '05:00', endTime: '23:30', frequency: 15 },
          WR9002: { startTime: '05:00', endTime: '23:30', frequency: 15 },
          WR9003: { startTime: '05:05', endTime: '23:35', frequency: 20 },
          WR9004: { startTime: '05:05', endTime: '23:35', frequency: 20 },
          WR9005: { startTime: '05:15', endTime: '23:45', frequency: 20 },
          CR8001: { startTime: '05:10', endTime: '23:30', frequency: 15 },
          CR8002: { startTime: '05:10', endTime: '23:30', frequency: 15 },
          CR8003: { startTime: '05:15', endTime: '23:45', frequency: 20 },
          CR8004: { startTime: '05:15', endTime: '23:45', frequency: 20 },
          HR7001: { startTime: '05:00', endTime: '23:40', frequency: 20 },
          HR7002: { startTime: '05:00', endTime: '23:40', frequency: 20 },
          HR7003: { startTime: '05:10', endTime: '23:50', frequency: 20 },
          HR7004: { startTime: '05:10', endTime: '23:50', frequency: 20 },
        };

        const template = LOCAL_TEMPLATES[train.trainNumber] || { startTime: '05:00', endTime: '23:30', frequency: 20 };
        const firstRouteStop = train.routes[0];
        const templateStartMins = parseTimeToMinutes(firstRouteStop.departureTime || firstRouteStop.arrivalTime);

        const startMins = parseTimeToMinutes(template.startTime);
        const endMins = parseTimeToMinutes(template.endTime);

        const generatedInstances = [];

        for (let t = startMins; t <= endMins; t += template.frequency) {
          const shiftMins = t - templateStartMins;

          let currentOffset = 0;
          let lastMinutes = 0;
          const processedRoutes = train.routes.map((r) => {
            const arrTimeMin = r.arrivalTime ? parseTimeToMinutes(r.arrivalTime) : null;
            const depTimeMin = r.departureTime ? parseTimeToMinutes(r.departureTime) : null;

            let arrMinAbs = arrTimeMin;
            if (arrMinAbs !== null) {
              if (arrMinAbs < lastMinutes) currentOffset += 1440;
              arrMinAbs += currentOffset;
              lastMinutes = arrMinAbs;
            }

            let depMinAbs = depTimeMin;
            if (depMinAbs !== null) {
              if (depMinAbs < lastMinutes) currentOffset += 1440;
              depMinAbs += currentOffset;
              lastMinutes = depMinAbs;
            }

            return {
              arrMinAbs: arrMinAbs !== null ? arrMinAbs + shiftMins : null,
              depMinAbs: depMinAbs !== null ? depMinAbs + shiftMins : null,
            };
          });

          const firstStopDep = processedRoutes[0].depMinAbs ?? 0;
          const lastStopArr = processedRoutes[routesCount - 1].arrMinAbs ?? 0;

          const startMs = targetMidnight.getTime() + firstStopDep * 60 * 1000;
          const endMs = targetMidnight.getTime() + (lastStopArr + delayMins) * 60 * 1000;
          const nowMs = now.getTime();

          let journeyState: 'UPCOMING' | 'RUNNING' | 'COMPLETED' = 'RUNNING';
          let countdownMinutes = 0;

          if (nowMs < startMs) {
            journeyState = 'UPCOMING';
            countdownMinutes = Math.ceil((startMs - nowMs) / (60 * 1000));
          } else if (nowMs > endMs) {
            journeyState = 'COMPLETED';
          }

          // Completed services will not be shown in the default commuter view.
          // Upcoming services starting after 180 mins are hidden to keep timetable relevant.
          const isUpcomingTooFar = journeyState === 'UPCOMING' && countdownMinutes > 180;
          if (journeyState === 'COMPLETED' || isUpcomingTooFar) {
            continue;
          }

          let currentBounds = null;
          if (journeyState === 'RUNNING') {
            const timeFromStartMin = (nowMs - targetMidnight.getTime()) / (60 * 1000);
            let foundIndex = 0;

            for (let i = 0; i < routesCount; i++) {
              const routeStop = processedRoutes[i];
              const expArr = (routeStop.arrMinAbs ?? 0) + delayMins;
              const expDep = (routeStop.depMinAbs ?? 0) + delayMins;

              if (i === 0) {
                if (timeFromStartMin < expDep) {
                  foundIndex = 0;
                  break;
                }
              } else if (i === routesCount - 1) {
                if (timeFromStartMin >= expArr) {
                  foundIndex = routesCount - 1;
                  break;
                }
              } else {
                if (timeFromStartMin >= expArr && timeFromStartMin < expDep) {
                  foundIndex = i;
                  break;
                }
              }

              if (i < routesCount - 1) {
                const nextStop = processedRoutes[i + 1];
                const nextStopArr = nextStop.arrMinAbs ?? 0;
                if (timeFromStartMin >= expDep && timeFromStartMin < nextStopArr + delayMins) {
                  foundIndex = i;
                  break;
                }
              }
            }

            const nextIdx = Math.min(routesCount - 1, foundIndex + 1);
            const nextStop = processedRoutes[nextIdx];
            const expectedArr = (nextStop.arrMinAbs ?? 0) + delayMins;
            const minutesToNext = Math.max(1, Math.ceil(expectedArr - timeFromStartMin));

            currentBounds = {
              currentStationName: train.routes[foundIndex]?.station?.name || train.fromStation,
              currentStationCode: train.routes[foundIndex]?.station?.code || train.fromStation,
              nextStationName: train.routes[nextIdx]?.station?.name || train.toStation,
              nextStationCode: train.routes[nextIdx]?.station?.code || train.toStation,
              platform: train.routes[foundIndex]?.platform || "1",
              minutesToNext,
            };
          }

          const depTimeStr = minutesToTimeStr(firstStopDep);
          const arrTimeStr = minutesToTimeStr(lastStopArr);
          const timeSuffix = depTimeStr.replace(':', '');
          const instanceTrainNumber = `${train.trainNumber}-${timeSuffix}`;
          const instanceId = `${train.id}-${timeSuffix}`;

          generatedInstances.push({
            id: instanceId,
            trainNumber: instanceTrainNumber,
            name: train.name,
            type: train.type,
            from: firstRouteStop?.station?.city || train.fromStation,
            to: train.routes[routesCount - 1]?.station?.city || train.toStation,
            fromCode: firstRouteStop?.station?.code || train.fromStation,
            toCode: train.routes[routesCount - 1]?.station?.code || train.toStation,
            departure: depTimeStr,
            arrival: arrTimeStr,
            expectedDeparture: minutesToTimeStr(firstStopDep + delayMins),
            expectedArrival: minutesToTimeStr(lastStopArr + delayMins),
            totalStops: routesCount,
            delayMinutes: delayMins,
            delayReason: delay?.reason || null,
            isOnTime: delayMins === 0,
            journeyState,
            countdownMinutes,
            currentBounds,
          });
        }

        return generatedInstances;
      }
    }).filter(Boolean);

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
