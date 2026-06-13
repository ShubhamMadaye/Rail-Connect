import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Helper to resolve city name to station code
function findStationCode(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('delhi') || t.includes('ndls')) return 'NDLS';
  if (t.includes('mumbai central') || t.includes('mcl') || t.includes('mmct')) return 'MMCT';
  if (t.includes('mumbai') || t.includes('csmt') || t.includes('cstm')) return 'CSTM';
  if (t.includes('chennai') || t.includes('mas')) return 'MAS';
  if (t.includes('kolkata') || t.includes('howrah') || t.includes('hwh')) return 'HWH';
  if (t.includes('bangalore') || t.includes('bengaluru') || t.includes('sbc')) return 'SBC';
  if (t.includes('pune') || t.includes('pune jn')) return 'PUNE';
  if (t.includes('ahmedabad') || t.includes('adi')) return 'ADI';
  if (t.includes('jaipur') || t.includes('jp')) return 'JP';
  if (t.includes('hyderabad') || t.includes('hyd') || t.includes('hyb')) return 'HYB';
  if (t.includes('bhopal') || t.includes('bpl')) return 'BPL';
  if (t.includes('patna') || t.includes('pnbe')) return 'PNBE';
  if (t.includes('lucknow') || t.includes('lko')) return 'LKO';
  if (t.includes('thane') || t.includes('tna')) return 'TNA';
  if (t.includes('kalyan') || t.includes('kyn')) return 'KYN';
  if (t.includes('panvel') || t.includes('pnvl')) return 'PNVL';
  return null;
}

// POST /api/assistant/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message query is required' });

    const query = message.toLowerCase();
    let reply = '';

    // 1. Train Search Inquiries
    if (query.includes('train') || query.includes('search') || query.includes('go to') || query.includes('travel to')) {
      const fromCode = findStationCode(query.split('to')[0] || '');
      const toCode = findStationCode(query.split('to')[1] || query);

      if (fromCode && toCode && fromCode !== toCode) {
        // Query database for trains between these codes
        const trainsList = await prisma.train.findMany({
          where: { isActive: true },
          include: { routes: { include: { station: true } } }
        });

        const matches = trainsList.filter(train => {
          const fromIdx = train.routes.findIndex(r => r.station.code === fromCode);
          const toIdx = train.routes.findIndex(r => r.station.code === toCode);
          return fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx;
        });

        if (matches.length > 0) {
          reply = `Here are the active trains running from ${fromCode} to ${toCode}:\n\n` +
            `| Train | Number | Type | Stations |\n` +
            `|---|---|---|---|\n` +
            matches.map(t => `| ${t.name} | ${t.trainNumber} | ${t.type} | ${t.fromStation} to ${t.toStation} |`).join('\n') +
            `\n\nYou can book any of these trains directly via the search page.`;
        } else {
          reply = `I found station codes for your query (${fromCode} to ${toCode}), but there are no direct trains matching this route in the database currently. Try searching another route like Mumbai to Delhi.`;
        }
      } else {
        reply = `To search for trains, please specify the origin and destination cities. For example: "Which trains run from Mumbai to Delhi?" or "Find trains to Chennai".`;
      }
    }
    // 2. Delays Inquiries
    else if (query.includes('delay') || query.includes('late') || query.includes('status') || query.includes('on time')) {
      // Look for train number or name
      const trains = await prisma.train.findMany({ where: { isActive: true } });
      const matchedTrain = trains.find(t => query.includes(t.trainNumber.toLowerCase()) || query.includes(t.name.toLowerCase()));

      if (matchedTrain) {
        const todayStr = new Date().toISOString().split('T')[0];
        const delay = await prisma.delay.findUnique({
          where: { trainId_date: { trainId: matchedTrain.id, date: todayStr } }
        });

        if (delay && delay.delayMinutes > 0) {
          reply = `Live status update for Train ${matchedTrain.trainNumber} (${matchedTrain.name}):\n\n` +
            `This train is currently running late by ${delay.delayMinutes} minutes today due to ${delay.reason || 'traffic congestion'}.\n` +
            `Expected delay at stops: Approximately ${delay.delayMinutes} minutes.`;
        } else {
          reply = `Live status update for Train ${matchedTrain.trainNumber} (${matchedTrain.name}):\n\n` +
            `This train is running on-time today. There are no active delays reported.`;
        }
      } else {
        // Query overall delays
        const todayStr = new Date().toISOString().split('T')[0];
        const delayedList = await prisma.delay.findMany({
          where: { date: todayStr, delayMinutes: { gt: 0 } },
          include: { train: true }
        });

        if (delayedList.length > 0) {
          reply = `Here is the list of active train delays reported today:\n\n` +
            `| Train Number | Train Name | Delay | Reason |\n` +
            `|---|---|---|---|\n` +
            delayedList.map(d => `| ${d.train.trainNumber} | ${d.train.name} | ${d.delayMinutes} mins | ${d.reason || 'Traffic'} |`).join('\n');
        } else {
          reply = `All trains are currently operating on-time. No delays have been reported today.`;
        }
      }
    }
    // 3. Food Recommendations & Menu Queries
    else if (query.includes('food') || query.includes('eat') || query.includes('menu') || query.includes('meal') || query.includes('veg')) {
      const items = await prisma.foodItem.findMany({
        include: { vendor: { include: { station: true } } }
      });

      const isVegQuery = query.includes('veg') && !query.includes('non');
      const filteredItems = isVegQuery ? items.filter(i => i.isVeg) : items;

      reply = `Here are the popular food options available for in-train delivery:\n\n` +
        `| Vendor | Station | Food Item | Category | Price | Type |\n` +
        `|---|---|---|---|---|---|\n` +
        filteredItems.slice(0, 6).map(i => 
          `| ${i.vendor.name} | ${i.vendor.station.name} | ${i.name} | ${i.category} | Rs. ${i.price} | ${i.isVeg ? 'Veg' : 'Non-Veg'} |`
        ).join('\n') +
        `\n\nYou can order these items directly on-board once you book a ticket.`;
    }
    // 4. Ticket Booking / Cancel / Refund Policies
    else if (query.includes('cancel') || query.includes('refund') || query.includes('policy') || query.includes('rule')) {
      reply = `Standard Cancellation & Refund Policy:\n\n` +
        `* Cancellation requests submitted more than 24 hours before train departure receive a 100% fare refund (minus Rs. 50 flat clerkage charge).\n` +
        `* Cancellations made between 24 hours and 4 hours before departure receive a 50% refund.\n` +
        `* No refunds are issued for bookings cancelled within 4 hours of departure.\n` +
        `* For Waitlisted tickets: If a ticket fails to confirm, it is automatically cancelled with a full refund.\n` +
        `* Refunds are processed automatically and credited back to the payment method within 5 to 7 business days.`;
    }
    // 5. Default Fallback
    else {
      reply = `Hello! I am your Railway Knowledge Assistant. I can help you with:\n\n` +
        `* Train schedules and searches (e.g. "Trains from Mumbai to Delhi")\n` +
        `* Live delay reports (e.g. "Delay status of Mumbai Rajdhani")\n` +
        `* Fares and ticketing queries\n` +
        `* On-board food menus (e.g. "Show vegetarian food options")\n` +
        `* Cancellation and refund policies (e.g. "What is the refund policy?")\n\n` +
        `How can I assist you today?`;
    }

    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
