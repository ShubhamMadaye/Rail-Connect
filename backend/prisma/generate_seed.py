import json
import os

# Define core national express stations
core_stations = [
    { "id": "st-ndls", "code": "NDLS", "name": "New Delhi", "city": "New Delhi", "state": "Delhi" },
    { "id": "st-mas",  "code": "MAS",  "name": "Chennai Central", "city": "Chennai", "state": "Tamil Nadu" },
    { "id": "st-hwh",  "code": "HWH",  "name": "Howrah Junction", "city": "Kolkata", "state": "West Bengal" },
    { "id": "st-sbc",  "code": "SBC",  "name": "KSR Bengaluru", "city": "Bengaluru", "state": "Karnataka" },
    { "id": "st-pune", "code": "PUNE", "name": "Pune Junction", "city": "Pune", "state": "Maharashtra" },
    { "id": "st-adi",  "code": "ADI",  "name": "Ahmedabad Junction", "city": "Ahmedabad", "state": "Gujarat" },
    { "id": "st-jp",   "code": "JP",   "name": "Jaipur Junction", "city": "Jaipur", "state": "Rajasthan" },
    { "id": "st-hyd",  "code": "HYB",  "name": "Hyderabad Deccan", "city": "Hyderabad", "state": "Telangana" },
    { "id": "st-bpl",  "code": "BPL",  "name": "Bhopal Junction", "city": "Bhopal", "state": "Madhya Pradesh" },
    { "id": "st-pnbe", "code": "PNBE", "name": "Patna Junction", "city": "Patna", "state": "Bihar" },
    { "id": "st-lko",  "code": "LKO",  "name": "Lucknow NR", "city": "Lucknow", "state": "UP" }
]

# Load Wikipedia suburban stations
wiki_file = "mumbai_suburban_stations.json"
if os.path.exists(wiki_file):
    with open(wiki_file, "r", encoding="utf-8") as f:
        wiki_stations = json.load(f)
else:
    wiki_stations = []

# Merge stations avoiding code duplicates
all_stations = []
seen_codes = set()

for s in core_stations:
    all_stations.append(s)
    seen_codes.add(s["code"])

for s in wiki_stations:
    code = s["code"]
    if code in seen_codes:
        continue
    seen_codes.add(code)
    city = s["district"] if s["district"] else "Mumbai"
    if "Mumbai" in city:
        city = "Mumbai"
        
    all_stations.append({
        "id": f"st-{code.lower()}",
        "code": code,
        "name": s["name"],
        "city": city,
        "state": "Maharashtra"
    })

print(f"Total merged stations: {len(all_stations)}")

# Format stations as TS code block
station_lines = []
for s in all_stations:
    name_escaped = s['name'].replace("'", "\\'")
    line = f"    {{ id: '{s['id']}', code: '{s['code']}', name: '{name_escaped}', city: '{s['city']}', state: '{s['state']}' }},"
    station_lines.append(line)
stations_code_block = "\n".join(station_lines)

# Define sequences of station codes for automatic route generation
wr_sequence = [
    "CCG", "MEL", "CYR", "GTR", "MMCT", "MX", "PL", "PBHD", "DR", "MRU",
    "MM", "BA", "KHAR", "STC", "VLP", "ADH", "JOS", "RMAR", "GMN", "MDD",
    "KILE", "BVI", "DIC", "MIRA", "BYR", "NIG", "BSR", "NSP", "VR"
]
cr_sequence = [
    "CSTM", "MSD", "SNRD", "BY", "CHG", "CRD", "PR", "DR", "MTN", "SIN",
    "CLA", "VVH", "GC", "VK", "KJMG", "BND", "NHU", "MLND", "TNA", "KLVA",
    "MBQ", "DV", "KOPR", "DI", "THK", "KYN"
]
hr_sequence = [
    "CSTM", "MSD", "SNRD", "DKRD", "RRD", "CTGN", "SVE", "VDLR", "GTBN", "CHF",
    "CLA", "TKNG", "CMBR", "GV", "MNKD", "VSH", "SNCR", "JNJ", "NEU", "SWDV",
    "KHAG", "MANR", "KNDS", "PNVL"
]

def make_route(train_id, stations_sequence, start_time_str, skip_intermediate=False, fast_stops=None, is_reverse=False):
    seq = list(stations_sequence)
    if is_reverse:
        seq.reverse()
        
    if skip_intermediate and fast_stops:
        seq = [s for s in seq if s in fast_stops]
        
    route_entries = []
    
    h, m = map(int, start_time_str.split(':'))
    current_mins = h * 60 + m
    
    dist = 0
    for idx, station_code in enumerate(seq):
        stop_number = idx + 1
        is_first = (idx == 0)
        is_last = (idx == len(seq) - 1)
        
        if is_first:
            arr_time = "null"
            dep_time = f"'{start_time_str}'"
            halt = 0
        elif is_last:
            current_mins += (5 if skip_intermediate else 3)
            h_str = str(current_mins // 60 % 24).zfill(2)
            m_str = str(current_mins % 60).zfill(2)
            arr_time = f"'{h_str}:{m_str}'"
            dep_time = "null"
            halt = 0
        else:
            current_mins += (5 if skip_intermediate else 2)
            h_arr = str(current_mins // 60 % 24).zfill(2)
            m_arr = str(current_mins % 60).zfill(2)
            arr_time = f"'{h_arr}:{m_arr}'"
            
            current_mins += 1
            h_dep = str(current_mins // 60 % 24).zfill(2)
            m_dep = str(current_mins % 60).zfill(2)
            dep_time = f"'{h_dep}:{m_dep}'"
            halt = 1
            
        dist += (10 if skip_intermediate else 2) if idx > 0 else 0
        station_id = f"st-{station_code.lower()}"
        entry_id = f"r-{train_id}-{station_code.lower()}"
        route_entries.append(
            f"    {{ id: '{entry_id}', trainId: '{train_id}', stationId: '{station_id}', stopNumber: {stop_number}, arrivalTime: {arr_time}, departureTime: {dep_time}, distanceFromOrigin: {dist}, platform: '{stop_number % 4 + 1}', haltMinutes: {halt} }},"
        )
        
    return route_entries

# Fast stops sets
wr_fast_stops = {"CCG", "MMCT", "DR", "BA", "ADH", "BVI", "BYR", "BSR", "VR"}
cr_fast_stops = {"CSTM", "BY", "DR", "CLA", "GC", "TNA", "DI", "KYN"}

routes_code_lines = []

# Generate Routes dynamically
# 1. Rajdhani manual route
routes_code_lines.extend([
    "    { id: 'r-1', trainId: 'tr-12951', stationId: 'st-cstm', stopNumber: 1, arrivalTime: null, departureTime: '17:00', distanceFromOrigin: 0, platform: '1', haltMinutes: 0 },",
    "    { id: 'r-2', trainId: 'tr-12951', stationId: 'st-adi',  stopNumber: 2, arrivalTime: '22:30', departureTime: '22:40', distanceFromOrigin: 493, platform: '3', haltMinutes: 10 },",
    "    { id: 'r-3', trainId: 'tr-12951', stationId: 'st-jp',   stopNumber: 3, arrivalTime: '05:00', departureTime: '05:10', distanceFromOrigin: 1100, platform: '1', haltMinutes: 10 },",
    "    { id: 'r-4', trainId: 'tr-12951', stationId: 'st-ndls', stopNumber: 4, arrivalTime: '08:32', departureTime: null, distanceFromOrigin: 1384, platform: '3', haltMinutes: 0 },"
])

# 2. Shatabdi: CSMT - Thane - Vasai Road - ADI
routes_code_lines.extend([
    "    { id: 'r-sh-1', trainId: 'tr-12009', stationId: 'st-cstm', stopNumber: 1, arrivalTime: null, departureTime: '06:25', distanceFromOrigin: 0, platform: '3', haltMinutes: 0 },",
    "    { id: 'r-sh-2', trainId: 'tr-12009', stationId: 'st-tna',  stopNumber: 2, arrivalTime: '06:50', departureTime: '06:52', distanceFromOrigin: 33, platform: '5', haltMinutes: 2 },",
    "    { id: 'r-sh-3', trainId: 'tr-12009', stationId: 'st-bsr',  stopNumber: 3, arrivalTime: '07:35', departureTime: '07:37', distanceFromOrigin: 75, platform: '6', haltMinutes: 2 },",
    "    { id: 'r-sh-4', trainId: 'tr-12009', stationId: 'st-adi',  stopNumber: 4, arrivalTime: '12:20', departureTime: null, distanceFromOrigin: 490, platform: '1', haltMinutes: 0 },"
])

# 3. Duronto: Pune - Vasai Road - ADI - NDLS
routes_code_lines.extend([
    "    { id: 'r-du-1', trainId: 'tr-12263', stationId: 'st-pune', stopNumber: 1, arrivalTime: null, departureTime: '11:10', distanceFromOrigin: 0, platform: '1', haltMinutes: 0 },",
    "    { id: 'r-du-2', trainId: 'tr-12263', stationId: 'st-bsr',  stopNumber: 2, arrivalTime: '13:55', departureTime: '14:00', distanceFromOrigin: 150, platform: '6', haltMinutes: 5 },",
    "    { id: 'r-du-3', trainId: 'tr-12263', stationId: 'st-adi',  stopNumber: 3, arrivalTime: '18:40', departureTime: '18:50', distanceFromOrigin: 490, platform: '3', haltMinutes: 10 },",
    "    { id: 'r-du-4', trainId: 'tr-12263', stationId: 'st-ndls', stopNumber: 4, arrivalTime: '05:55', departureTime: null, distanceFromOrigin: 1380, platform: '4', haltMinutes: 0 },"
])

# 4. Karnataka Express: SBC - Pune - NDLS
routes_code_lines.extend([
    "    { id: 'r-ka-1', trainId: 'tr-12627', stationId: 'st-sbc',  stopNumber: 1, arrivalTime: null, departureTime: '19:20', distanceFromOrigin: 0, platform: '1', haltMinutes: 0 },",
    "    { id: 'r-ka-2', trainId: 'tr-12627', stationId: 'st-pune', stopNumber: 2, arrivalTime: '08:45', departureTime: '08:55', distanceFromOrigin: 1000, platform: '2', haltMinutes: 10 },",
    "    { id: 'r-ka-3', trainId: 'tr-12627', stationId: 'st-ndls', stopNumber: 3, arrivalTime: '05:40', departureTime: null, distanceFromOrigin: 2000, platform: '2', haltMinutes: 0 },"
])

# 5. Gitanjali: CSMT - Dadar - Thane - Kalyan - Pune - HWH
routes_code_lines.extend([
    "    { id: 'r-gi-1', trainId: 'tr-12859', stationId: 'st-cstm', stopNumber: 1, arrivalTime: null, departureTime: '06:00', distanceFromOrigin: 0, platform: '18', haltMinutes: 0 },",
    "    { id: 'r-gi-2', trainId: 'tr-12859', stationId: 'st-dr',   stopNumber: 2, arrivalTime: '06:12', departureTime: '06:15', distanceFromOrigin: 9, platform: '5', haltMinutes: 3 },",
    "    { id: 'r-gi-3', trainId: 'tr-12859', stationId: 'st-tna',  stopNumber: 3, arrivalTime: '06:33', departureTime: '06:35', distanceFromOrigin: 33, platform: '5', haltMinutes: 2 },",
    "    { id: 'r-gi-4', trainId: 'tr-12859', stationId: 'st-kyn',  stopNumber: 4, arrivalTime: '06:53', departureTime: '06:55', distanceFromOrigin: 53, platform: '4', haltMinutes: 2 },",
    "    { id: 'r-gi-5', trainId: 'tr-12859', stationId: 'st-pune', stopNumber: 5, arrivalTime: '09:40', departureTime: '09:45', distanceFromOrigin: 191, platform: '1', haltMinutes: 5 },",
    "    { id: 'r-gi-6', trainId: 'tr-12859', stationId: 'st-hwh',  stopNumber: 6, arrivalTime: '12:30', departureTime: null, distanceFromOrigin: 1968, platform: '21', haltMinutes: 0 },"
])

# 6. Deccan Queen: Pune - Kalyan - Thane - Dadar - CSMT
routes_code_lines.extend([
    "    { id: 'r-dq-1', trainId: 'tr-dq', stationId: 'st-pune', stopNumber: 1, arrivalTime: null, departureTime: '07:15', distanceFromOrigin: 0, platform: '1', haltMinutes: 0 },",
    "    { id: 'r-dq-2', trainId: 'tr-dq', stationId: 'st-kyn',  stopNumber: 2, arrivalTime: '09:30', departureTime: '09:32', distanceFromOrigin: 138, platform: '6', haltMinutes: 2 },",
    "    { id: 'r-dq-3', trainId: 'tr-dq', stationId: 'st-tna',  stopNumber: 3, arrivalTime: '09:50', departureTime: '09:52', distanceFromOrigin: 158, platform: '6', haltMinutes: 2 },",
    "    { id: 'r-dq-4', trainId: 'tr-dq', stationId: 'st-dr',   stopNumber: 4, arrivalTime: '10:15', departureTime: '10:17', distanceFromOrigin: 182, platform: '6', haltMinutes: 2 },",
    "    { id: 'r-dq-5', trainId: 'tr-dq', stationId: 'st-cstm', stopNumber: 5, arrivalTime: '10:30', departureTime: null, distanceFromOrigin: 191, platform: '8', haltMinutes: 0 },"
])

# 7. Deccan Queen Return: CSMT - Dadar - Thane - Kalyan - Pune
routes_code_lines.extend([
    "    { id: 'r-dqr-1', trainId: 'tr-dq-ret', stationId: 'st-cstm', stopNumber: 1, arrivalTime: null, departureTime: '17:10', distanceFromOrigin: 0, platform: '8', haltMinutes: 0 },",
    "    { id: 'r-dqr-2', trainId: 'tr-dq-ret', stationId: 'st-dr',   stopNumber: 2, arrivalTime: '17:22', departureTime: '17:24', distanceFromOrigin: 9, platform: '8', haltMinutes: 2 },",
    "    { id: 'r-dqr-3', trainId: 'tr-dq-ret', stationId: 'st-tna',  stopNumber: 3, arrivalTime: '17:45', departureTime: '17:47', distanceFromOrigin: 33, platform: '7', haltMinutes: 2 },",
    "    { id: 'r-dqr-4', trainId: 'tr-dq-ret', stationId: 'st-kyn',  stopNumber: 4, arrivalTime: '18:08', departureTime: '18:10', distanceFromOrigin: 53, platform: '5', haltMinutes: 2 },",
    "    { id: 'r-dqr-5', trainId: 'tr-dq-ret', stationId: 'st-pune', stopNumber: 5, arrivalTime: '20:15', departureTime: null, distanceFromOrigin: 191, platform: '5', haltMinutes: 0 },"
])

# 8. Konkan Kanya: CSMT - Dadar - Thane - Panvel
routes_code_lines.extend([
    "    { id: 'r-kk-1', trainId: 'tr-kk', stationId: 'st-cstm', stopNumber: 1, arrivalTime: null, departureTime: '23:05', distanceFromOrigin: 0, platform: '17', haltMinutes: 0 },",
    "    { id: 'r-kk-2', trainId: 'tr-kk', stationId: 'st-dr',   stopNumber: 2, arrivalTime: '23:17', departureTime: '23:20', distanceFromOrigin: 9, platform: '7', haltMinutes: 3 },",
    "    { id: 'r-kk-3', trainId: 'tr-kk', stationId: 'st-tna',  stopNumber: 3, arrivalTime: '23:42', departureTime: '23:45', distanceFromOrigin: 33, platform: '7', haltMinutes: 3 },",
    "    { id: 'r-kk-4', trainId: 'tr-kk', stationId: 'st-pnvl', stopNumber: 4, arrivalTime: '00:30', departureTime: null, distanceFromOrigin: 68, platform: '2', haltMinutes: 0 },"
])

# 9. Konkan Kanya Return: Panvel - Thane - Dadar - CSMT
routes_code_lines.extend([
    "    { id: 'r-kkr-1', trainId: 'tr-kk-ret', stationId: 'st-pnvl', stopNumber: 1, arrivalTime: null, departureTime: '04:15', distanceFromOrigin: 0, platform: '2', haltMinutes: 0 },",
    "    { id: 'r-kkr-2', trainId: 'tr-kk-ret', stationId: 'st-tna',  stopNumber: 2, arrivalTime: '05:00', departureTime: '05:03', distanceFromOrigin: 35, platform: '7', haltMinutes: 3 },",
    "    { id: 'r-kkr-3', trainId: 'tr-kk-ret', stationId: 'st-dr',   stopNumber: 3, arrivalTime: '05:25', departureTime: '05:28', distanceFromOrigin: 59, platform: '6', haltMinutes: 3 },",
    "    { id: 'r-kkr-4', trainId: 'tr-kk-ret', stationId: 'st-cstm', stopNumber: 4, arrivalTime: '05:45', departureTime: null, distanceFromOrigin: 68, platform: '17', haltMinutes: 0 },"
])

# Generate Dynamic Suburban Routes
routes_code_lines.extend(make_route('tr-wl-1', wr_sequence, '08:00', skip_intermediate=True, fast_stops=wr_fast_stops))
routes_code_lines.extend(make_route('tr-wl-2', wr_sequence, '09:30', skip_intermediate=True, fast_stops=wr_fast_stops, is_reverse=True))

# Adjust WR9003 to stop at BVI.
bvi_idx = wr_sequence.index("BVI")
routes_code_lines.extend(make_route('tr-wl-3', wr_sequence[:bvi_idx+1], '08:15', skip_intermediate=False, fast_stops=None))
routes_code_lines.extend(make_route('tr-wl-4', wr_sequence[:bvi_idx+1], '09:45', skip_intermediate=False, fast_stops=None, is_reverse=True))
routes_code_lines.extend(make_route('tr-wl-5', wr_sequence, '08:30', skip_intermediate=False, fast_stops=None)) # Slow to Virar

routes_code_lines.extend(make_route('tr-cl-1', cr_sequence, '09:00', skip_intermediate=True, fast_stops=cr_fast_stops))
routes_code_lines.extend(make_route('tr-cl-2', cr_sequence, '10:30', skip_intermediate=True, fast_stops=cr_fast_stops, is_reverse=True))

tna_idx = cr_sequence.index("TNA")
routes_code_lines.extend(make_route('tr-cl-3', cr_sequence[:tna_idx+1], '09:15', skip_intermediate=False, fast_stops=None))
routes_code_lines.extend(make_route('tr-cl-4', cr_sequence[:tna_idx+1], '10:45', skip_intermediate=False, fast_stops=None, is_reverse=True))

routes_code_lines.extend(make_route('tr-hl-1', hr_sequence, '10:00', skip_intermediate=False, fast_stops=None))
routes_code_lines.extend(make_route('tr-hl-2', hr_sequence, '11:30', skip_intermediate=False, fast_stops=None, is_reverse=True))

vsh_idx = hr_sequence.index("VSH")
routes_code_lines.extend(make_route('tr-hl-3', hr_sequence[:vsh_idx+1], '10:15', skip_intermediate=False, fast_stops=None))
routes_code_lines.extend(make_route('tr-hl-4', hr_sequence[:vsh_idx+1], '11:15', skip_intermediate=False, fast_stops=None, is_reverse=True))

routes_code_block = "\n".join(routes_code_lines)

# Master Train ids list for delay generations
all_train_ids = [
    'tr-12951', 'tr-12009', 'tr-12263', 'tr-12627', 'tr-12859',
    'tr-dq', 'tr-dq-ret', 'tr-kk', 'tr-kk-ret',
    'tr-wl-1', 'tr-wl-2', 'tr-wl-3', 'tr-wl-4', 'tr-wl-5',
    'tr-cl-1', 'tr-cl-2', 'tr-cl-3', 'tr-cl-4',
    'tr-hl-1', 'tr-hl-2', 'tr-hl-3', 'tr-hl-4'
]

train_id_ts_array = ", ".join([f"'{tid}'" for tid in all_train_ids])

seed_content = f"""/// <reference types="node" />
import {{ PrismaClient }} from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {{
  console.log('[SEED] Seeding database schema with Wikipedia Mumbai Suburban railway stations...');

  // Clear existing data safely
  await prisma.foodOrder.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.foodVendor.deleteMany();
  await prisma.passenger.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.delay.deleteMany();
  await prisma.trainRoute.deleteMany();
  await prisma.train.deleteMany();
  await prisma.station.deleteMany();
  await prisma.user.deleteMany();

  // --- USERS ---------------------------------------------------------------
  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminPass = await bcrypt.hash('admin123', 10);

  await prisma.user.createMany({{
    data: [
      {{ id: 'user-1', name: 'Rahul Sharma', email: 'rahul@example.com', phone: '9876543210', password: hashedPassword, role: 'user' }},
      {{ id: 'user-2', name: 'Priya Patel', email: 'priya@example.com', phone: '9876543211', password: hashedPassword, role: 'user' }},
      {{ id: 'admin-1', name: 'Admin User', email: 'admin@railway.com', phone: '9999999999', password: adminPass, role: 'admin' }},
    ],
  }});
  console.log('[SUCCESS] Users seeded');

  // --- STATIONS -----------------------------------------------------------
  const stations = [
{stations_code_block}
  ];
  await prisma.station.createMany({{ data: stations }});
  console.log('[SUCCESS] Stations seeded');

  // --- TRAINS --------------------------------------------------------------
  const trains = [
    // Express Trains
    {{ id: 'tr-12951', trainNumber: '12951', name: 'Mumbai Rajdhani Express', type: 'Rajdhani', fromStation: 'NDLS', toStation: 'CSTM', totalSeats: 1000 }},
    {{ id: 'tr-12009', trainNumber: '12009', name: 'Shatabdi Express', type: 'Shatabdi', fromStation: 'CSTM', toStation: 'ADI', totalSeats: 800 }},
    {{ id: 'tr-12263', trainNumber: '12263', name: 'Pune Nizamuddin Duronto', type: 'Duronto', fromStation: 'PUNE', toStation: 'NDLS', totalSeats: 900 }},
    {{ id: 'tr-12627', trainNumber: '12627', name: 'Karnataka Express', type: 'Superfast', fromStation: 'SBC', toStation: 'NDLS', totalSeats: 1200 }},
    {{ id: 'tr-12859', trainNumber: '12859', name: 'Gitanjali Express', type: 'Superfast', fromStation: 'CSTM', toStation: 'HWH', totalSeats: 1100 }},
    {{ id: 'tr-dq',    trainNumber: '12124', name: 'Deccan Queen', type: 'Superfast', fromStation: 'PUNE', toStation: 'CSTM', totalSeats: 800 }},
    {{ id: 'tr-dq-ret',trainNumber: '12123', name: 'Deccan Queen Return', type: 'Superfast', fromStation: 'CSTM', toStation: 'PUNE', totalSeats: 800 }},
    {{ id: 'tr-kk',    trainNumber: '10111', name: 'Konkan Kanya Express', type: 'Express', fromStation: 'CSTM', toStation: 'PNVL', totalSeats: 900 }},
    {{ id: 'tr-kk-ret',trainNumber: '10112', name: 'Konkan Kanya Return', type: 'Express', fromStation: 'PNVL', toStation: 'CSTM', totalSeats: 900 }},
    
    // Western Line Locals
    {{ id: 'tr-wl-1', trainNumber: 'WR9001', name: 'Churchgate - Virar Fast', type: 'Local', fromStation: 'CCG', toStation: 'VR', totalSeats: 3000 }},
    {{ id: 'tr-wl-2', trainNumber: 'WR9002', name: 'Virar - Churchgate Fast', type: 'Local', fromStation: 'VR', toStation: 'CCG', totalSeats: 3000 }},
    {{ id: 'tr-wl-3', trainNumber: 'WR9003', name: 'Churchgate - Borivali Slow', type: 'Local', fromStation: 'CCG', toStation: 'BVI', totalSeats: 3000 }},
    {{ id: 'tr-wl-4', trainNumber: 'WR9004', name: 'Borivali - Churchgate Slow', type: 'Local', fromStation: 'BVI', toStation: 'CCG', totalSeats: 3000 }},
    {{ id: 'tr-wl-5', trainNumber: 'WR9005', name: 'Churchgate - Virar Slow', type: 'Local', fromStation: 'CCG', toStation: 'VR', totalSeats: 3000 }},
    
    // Central Line Locals
    {{ id: 'tr-cl-1', trainNumber: 'CR8001', name: 'CSMT - Kalyan Fast', type: 'Local', fromStation: 'CSTM', toStation: 'KYN', totalSeats: 3000 }},
    {{ id: 'tr-cl-2', trainNumber: 'CR8002', name: 'Kalyan - CSMT Fast', type: 'Local', fromStation: 'KYN', toStation: 'CSTM', totalSeats: 3000 }},
    {{ id: 'tr-cl-3', trainNumber: 'CR8003', name: 'CSMT - Thane Slow', type: 'Local', fromStation: 'CSTM', toStation: 'TNA', totalSeats: 3000 }},
    {{ id: 'tr-cl-4', trainNumber: 'CR8004', name: 'Thane - CSMT Slow', type: 'Local', fromStation: 'TNA', toStation: 'CSTM', totalSeats: 3000 }},
    
    // Harbour Line Locals
    {{ id: 'tr-hl-1', trainNumber: 'HR7001', name: 'CSMT - Panvel Local', type: 'Local', fromStation: 'CSTM', toStation: 'PNVL', totalSeats: 3000 }},
    {{ id: 'tr-hl-2', trainNumber: 'HR7002', name: 'Panvel - CSMT Local', type: 'Local', fromStation: 'PNVL', toStation: 'CSTM', totalSeats: 3000 }},
    {{ id: 'tr-hl-3', trainNumber: 'HR7003', name: 'CSMT - Vashi Local', type: 'Local', fromStation: 'CSTM', toStation: 'VSH', totalSeats: 3000 }},
    {{ id: 'tr-hl-4', trainNumber: 'HR7004', name: 'Vashi - CSMT Local', type: 'Local', fromStation: 'VSH', toStation: 'CSTM', totalSeats: 3000 }},
  ];
  await prisma.train.createMany({{ data: trains }});
  console.log('[SUCCESS] Trains seeded');

  // --- TRAIN ROUTES --------------------------------------------------------
  const routes = [
{routes_code_block}
  ];
  await prisma.trainRoute.createMany({{ data: routes }});
  console.log('[SUCCESS] Train Routes seeded');

  // --- FOOD VENDORS --------------------------------------------------------
  const vendors = [
    {{ id: 'v-1', stationId: 'st-ndls', name: 'Delhi Darbar', cuisine: 'North Indian', rating: 4.5, isOpen: true }},
    {{ id: 'v-2', stationId: 'st-cstm', name: 'Aram Vada Pav', cuisine: 'Street Food', rating: 4.8, isOpen: true }},
    {{ id: 'v-3', stationId: 'st-adi',  name: 'Gujarati Thali House', cuisine: 'Gujarati', rating: 4.3, isOpen: true }},
    {{ id: 'v-4', stationId: 'st-dr',   name: 'Prakash Upahar Kendra', cuisine: 'Maharashtrian', rating: 4.7, isOpen: true }},
  ];
  await prisma.foodVendor.createMany({{ data: vendors }});

  const foodItems = [
    {{ id: 'fi-1', vendorId: 'v-1', name: 'Butter Chicken Meal', category: 'Lunch', price: 250, isVeg: false, isAvailable: true, description: 'Served with 2 Naan and Rice' }},
    {{ id: 'fi-2', vendorId: 'v-1', name: 'Paneer Tikka', category: 'Snacks', price: 150, isVeg: true, isAvailable: true, description: 'With mint chutney' }},
    {{ id: 'fi-3', vendorId: 'v-2', name: 'Jumbo Vada Pav', category: 'Snacks', price: 40, isVeg: true, isAvailable: true, description: 'Iconic Mumbai snack' }},
    {{ id: 'fi-4', vendorId: 'v-3', name: 'Dhokla Set', category: 'Breakfast', price: 80, isVeg: true, isAvailable: true, description: 'Spongy and fresh' }},
    {{ id: 'fi-5', vendorId: 'v-4', name: 'Misal Pav', category: 'Breakfast', price: 90, isVeg: true, isAvailable: true, description: 'Spicy and authentic' }},
  ];
  await prisma.foodItem.createMany({{ data: foodItems }});
  console.log('[SUCCESS] Food Ecosystem seeded');

  // --- DELAYS --------------------------------------------------------------
  const todayDate = new Date();
  const delaysData: any[] = [];
  
  const trainIds = [ {train_id_ts_array} ];

  const delayReasons = [
    'Signal Failure', 'Track maintenance', 'Weather conditions',
    'Platform congestion', 'Late arrival of rake', 'Engine trouble'
  ];

  for (let i = 0; i <= 30; i++) {{
    const d = new Date();
    d.setDate(todayDate.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    trainIds.forEach((trainId) => {{
      const isPriority = trainId.startsWith('tr-12') || trainId === 'tr-dq' || trainId === 'tr-dq-ret';
      const delayProb = isPriority ? 0.15 : 0.40;

      if (Math.random() < delayProb) {{
        const delayMins = Math.floor(Math.random() * (isPriority ? 20 : 60)) + 5;
        const reason = delayReasons[Math.floor(Math.random() * delayReasons.length)];
        delaysData.push({{
          id: `d-${{trainId}}-${{dateStr}}`,
          trainId,
          date: dateStr,
          delayMinutes: delayMins,
          reason,
        }});
      }} else {{
        delaysData.push({{
          id: `d-${{trainId}}-${{dateStr}}`,
          trainId,
          date: dateStr,
          delayMinutes: 0,
          reason: null,
        }});
      }}
    }});
  }}

  await prisma.delay.createMany({{ data: delaysData }});
  console.log(`[SUCCESS] ${{delaysData.length}} Delay records seeded (past 30 days included)`);

  console.log('[SUCCESS] Seeding Completed Successfully!');
}}

main()
  .catch((e) => {{
    console.error(e);
    process.exit(1);
  }})
  .finally(async () => {{
    await prisma.$disconnect();
  }});
"""

with open("backend/prisma/seed.ts", "w", encoding="utf-8") as f:
    f.write(seed_content)
print("Successfully generated backend/prisma/seed.ts")
