import { v5 as uuidv5 } from 'uuid';
import postgres from 'postgres';
import * as argon2 from 'argon2';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

const SEED_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const ORG_ID = uuidv5('transitops-demo', SEED_NAMESPACE);
const NOW = new Date();

function uid(name: string) {
  return uuidv5(name, SEED_NAMESPACE);
}

function daysAgo(n: number) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

// --- Realistic Indian fleet data ---

const VEHICLES = [
  { reg: 'KA-01-AB-1234', name: 'Ashok Leyland 2518', model: '2518 IL', type: 'truck', capacity: 16000, odometer: 125430, fuel: 'diesel', cost: 2850000, date: '2022-03-15', status: 'available' },
  { reg: 'KA-01-CD-5678', name: 'Tata LPT 1613', model: '1613 TC', type: 'truck', capacity: 12000, odometer: 89200, fuel: 'diesel', cost: 2200000, date: '2022-06-10', status: 'on-trip' },
  { reg: 'KA-02-EF-9012', name: 'Eicher Pro 3015', model: '3015 HD', type: 'truck', capacity: 14000, odometer: 67800, fuel: 'diesel', cost: 1950000, date: '2023-01-20', status: 'available' },
  { reg: 'KA-03-GH-3456', name: 'Tata Ace Gold', model: 'Ace Gold', type: 'van', capacity: 1500, odometer: 45200, fuel: 'diesel', cost: 550000, date: '2023-05-12', status: 'in-shop' },
  { reg: 'KA-04-IJ-7890', name: 'Maruti Super Carry', model: 'Super Carry', type: 'van', capacity: 1000, odometer: 32100, fuel: 'petrol', cost: 480000, date: '2023-09-01', status: 'available' },
  { reg: 'KA-05-KL-1122', name: 'Toyota Innova Crysta', model: '2.4 GX', type: 'car', capacity: 500, odometer: 55400, fuel: 'diesel', cost: 2200000, date: '2021-11-05', status: 'on-trip' },
  { reg: 'KA-06-MN-3344', name: 'Tata Nexon EV', model: 'EV Max', type: 'ev', capacity: 400, odometer: 18200, fuel: 'electric', cost: 1650000, date: '2024-02-18', status: 'available' },
  { reg: 'KA-07-OP-5566', name: 'Mahindra Bolero Pik-Up', model: '1.5L', type: 'truck', capacity: 2000, odometer: 98100, fuel: 'diesel', cost: 850000, date: '2020-08-25', status: 'available' },
  { reg: 'KA-08-QR-7788', name: 'Tata 407 Gold SFC', model: '407 SFC', type: 'truck', capacity: 5000, odometer: 75600, fuel: 'diesel', cost: 1250000, date: '2022-01-30', status: 'available' },
  { reg: 'KA-09-ST-9900', name: 'BharatBenz 2823R', model: '2823R', type: 'truck', capacity: 25000, odometer: 31200, fuel: 'diesel', cost: 4200000, date: '2024-06-01', status: 'retired' },
  { reg: 'KA-10-UV-0011', name: 'Mahindra Jeeto', model: 'Jeeto Plus', type: 'van', capacity: 700, odometer: 28900, fuel: 'cng', cost: 420000, date: '2023-03-14', status: 'available' },
  { reg: 'KA-11-WX-0022', name: 'Toyota Hyryder', model: 'G Hybrid', type: 'car', capacity: 400, odometer: 12000, fuel: 'hybrid', cost: 1800000, date: '2024-08-10', status: 'available' },
];

const DRIVERS = [
  { name: 'Rajesh Kumar', license: 'DL-KA-2019-1234567', category: 'HMV', expiry: '2027-06-15', contact: '+91-9876543210', status: 'available' },
  { name: 'Suresh Patel', license: 'DL-KA-2018-2345678', category: 'HMV', expiry: '2026-11-20', contact: '+91-8765432109', status: 'on-trip' },
  { name: 'Manoj Singh', license: 'DL-KA-2020-3456789', category: 'HMV', expiry: '2025-02-28', contact: '+91-7654321098', status: 'off-duty' },
  { name: 'Vikram Reddy', license: 'DL-KA-2021-4567890', category: 'LMV', expiry: '2028-03-10', contact: '+91-6543210987', status: 'available' },
  { name: 'Anil Yadav', license: 'DL-KA-2017-5678901', category: 'HMV', expiry: '2026-08-05', contact: '+91-5432109876', status: 'suspended' },
  { name: 'Prakash Naik', license: 'DL-KA-2022-6789012', category: 'LMV', expiry: '2028-09-22', contact: '+91-4321098765', status: 'available' },
  { name: 'Sunil Shetty', license: 'DL-KA-2019-7890123', category: 'HGV', expiry: '2024-07-01', contact: '+91-3210987654', status: 'available' },
  { name: 'Deepak Verma', license: 'DL-KA-2023-8901234', category: 'LMV', expiry: '2029-01-15', contact: '+91-2109876543', status: 'available' },
];

const CUSTOMERS = [
  { name: 'Flipkart Warehouse', contact: 'Amit Sharma', email: 'amit.sharma@flipkart.com', phone: '+91-9988776655', addr: 'Survey No 45, Hosakote, Bangalore Rural', type: 'shipper' },
  { name: 'Amazon Fulfillment Center', contact: 'Priya Menon', email: 'priya.menon@amazon.in', phone: '+91-8877665544', addr: 'KIADB Industrial Area, Doddaballapur', type: 'shipper' },
  { name: 'Reliance Fresh DC', contact: 'Karthik Iyer', email: 'karthik.iyer@ril.com', phone: '+91-7766554433', addr: 'NH 44, Devanahalli, Bangalore', type: 'shipper' },
  { name: 'D-Mart Distribution', contact: 'Neha Gupta', email: 'neha.gupta@dmart.com', phone: '+91-6655443322', addr: 'Warehouse Zone 3, Peenya Industrial Area', type: 'receiver' },
  { name: 'BigBasket Hub', contact: 'Ravi Krishnan', email: 'ravi.k@bigbasket.com', phone: '+91-5544332211', addr: 'Kanakapura Road, Bangalore South', type: 'both' },
  { name: 'Metro Cash & Carry', contact: 'Deepa Rao', email: 'deepa.rao@metro.co.in', phone: '+91-4433221100', addr: 'Tumkur Road, Yeshwanthpur', type: 'receiver' },
];

// --- Bengaluru region GPS coordinates ---
const SRC = { lat: 13.0827, lng: 77.5874, label: 'Yelahanka Depot' };
const DESTS = [
  { lat: 12.9716, lng: 77.5946, label: 'MG Road, Bangalore Central' },
  { lat: 12.9516, lng: 77.7012, label: 'Whitefield, ITPL' },
  { lat: 12.8453, lng: 77.6603, label: 'Electronic City Phase 1' },
  { lat: 13.0234, lng: 77.5898, label: 'Hebbal Junction' },
  { lat: 12.9341, lng: 77.5156, label: 'Banashankari' },
  { lat: 13.0297, lng: 77.7275, label: 'KR Puram' },
  { lat: 12.8951, lng: 77.5630, label: 'JP Nagar' },
  { lat: 13.0219, lng: 77.4821, label: 'Peenya Industrial Area' },
];

const TRIPS = [
  { status: 'completed', vehicle: 0, driver: 0, cust: 0, cargo: 12500, src: SRC, dest: DESTS[0], dist: 28, days: 5 },
  { status: 'completed', vehicle: 1, driver: 1, cust: 0, cargo: 8000, src: SRC, dest: DESTS[1], dist: 35, days: 4 },
  { status: 'completed', vehicle: 2, driver: 3, cust: 1, cargo: 11000, src: SRC, dest: DESTS[2], dist: 32, days: 3 },
  { status: 'completed', vehicle: 5, driver: 6, cust: 2, cargo: 400, src: SRC, dest: DESTS[3], dist: 15, days: 2 },
  { status: 'completed', vehicle: 4, driver: 5, cust: 3, cargo: 800, src: SRC, dest: DESTS[4], dist: 22, days: 3 },
  { status: 'completed', vehicle: 0, driver: 0, cust: 4, cargo: 14000, src: SRC, dest: DESTS[5], dist: 40, days: 5 },
  { status: 'completed', vehicle: 7, driver: 1, cust: 5, cargo: 1600, src: SRC, dest: DESTS[6], dist: 18, days: 2 },
  { status: 'completed', vehicle: 1, driver: 2, cust: 0, cargo: 10000, src: SRC, dest: DESTS[7], dist: 25, days: 3 },
  { status: 'completed', vehicle: 8, driver: 3, cust: 1, cargo: 4200, src: SRC, dest: DESTS[0], dist: 28, days: 2 },
  { status: 'completed', vehicle: 10, driver: 5, cust: 2, cargo: 600, src: SRC, dest: DESTS[1], dist: 35, days: 1 },
  { status: 'dispatched', vehicle: 0, driver: 0, cust: 3, cargo: 15000, src: SRC, dest: DESTS[2], dist: 32, days: 0 },
  { status: 'in-transit', vehicle: 1, driver: 1, cust: 4, cargo: 9000, src: SRC, dest: DESTS[3], dist: 15, days: 0 },
  { status: 'in-transit', vehicle: 5, driver: 6, cust: 0, cargo: 350, src: SRC, dest: DESTS[4], dist: 22, days: 0 },
  { status: 'draft', vehicle: 2, driver: 0, cust: 1, cargo: 12000, src: SRC, dest: DESTS[5], dist: 40, days: -1 },
  { status: 'draft', vehicle: 4, driver: 5, cust: 5, cargo: 700, src: SRC, dest: DESTS[6], dist: 18, days: -2 },
  { status: 'draft', vehicle: 7, driver: 7, cust: 2, cargo: 1800, src: SRC, dest: DESTS[7], dist: 25, days: -1 },
  { status: 'cancelled', vehicle: 3, driver: 2, cust: 0, cargo: 8000, src: SRC, dest: DESTS[0], dist: 28, days: 3 },
  { status: 'cancelled', vehicle: 8, driver: 1, cust: 3, cargo: 4500, src: SRC, dest: DESTS[1], dist: 35, days: 2 },
  { status: 'completed', vehicle: 6, driver: 6, cust: 4, cargo: 300, src: SRC, dest: DESTS[2], dist: 32, days: 1 },
  { status: 'completed', vehicle: 10, driver: 7, cust: 1, cargo: 550, src: SRC, dest: DESTS[3], dist: 15, days: 1 },
];

async function seed() {
  const sql = postgres(env.DATABASE_URL, { max: 1 });

  try {
    logger.info('seeding organization and users...');

    // ---- Organization ----
    await sql`
      INSERT INTO organizations (id, name, slug)
      VALUES (${ORG_ID}, 'TransitOps Demo', 'transitops-demo')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    `;

    // ---- Admin user ----
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'TransitOps@123';
    const adminHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    const adminId = uid('user-admin');
    await sql`
      INSERT INTO users (id, organization_id, name, email, password_hash, role, status)
      VALUES (${adminId}, ${ORG_ID}, 'Admin User', 'admin@transitops.demo', ${adminHash}, 'admin', 'active')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
    `;

    // ---- Demo users ----
    const demoPassword = await argon2.hash('Demo@123', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    const ROLES = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] as const;
    for (const role of ROLES) {
      await sql`
        INSERT INTO users (id, organization_id, name, email, password_hash, role, status)
        VALUES (${uid(`user-${role}`)}, ${ORG_ID}, ${role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}, ${`${role}@transitops.demo`}, ${demoPassword}, ${role}, 'active')
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
      `;
    }

    logger.info('seeding vehicles...');
    const vehicleIds: string[] = [];
    for (let i = 0; i < VEHICLES.length; i++) {
      const v = VEHICLES[i]!;
      const vid = uid(`vehicle-${i}`);
      vehicleIds.push(vid);
      await sql`
        INSERT INTO vehicles (id, organization_id, registration_number, name, model, type, max_load_capacity, odometer, fuel_type, acquisition_cost, acquisition_date, status)
        VALUES (${vid}, ${ORG_ID}, ${v.reg}, ${v.name}, ${v.model}, ${v.type}, ${v.capacity}, ${v.odometer}, ${v.fuel}, ${v.cost}, ${v.date}, ${v.status})
        ON CONFLICT (organization_id, registration_number) DO UPDATE SET status = EXCLUDED.status, odometer = EXCLUDED.odometer
      `;
    }

    logger.info('seeding drivers...');
    const driverIds: string[] = [];
    for (let i = 0; i < DRIVERS.length; i++) {
      const d = DRIVERS[i]!;
      const did = uid(`driver-${i}`);
      driverIds.push(did);
      await sql`
        INSERT INTO drivers (id, organization_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, overall_score, status)
        VALUES (${did}, ${ORG_ID}, ${d.name}, ${d.license}, ${d.category}, ${d.expiry}, ${d.contact}, ${80 + Math.floor(Math.random() * 20)}, ${85 + Math.floor(Math.random() * 15)}, ${d.status})
        ON CONFLICT (organization_id, license_number) DO UPDATE SET status = EXCLUDED.status
      `;
    }

    logger.info('seeding customers...');
    const customerIds: string[] = [];
    for (let i = 0; i < CUSTOMERS.length; i++) {
      const c = CUSTOMERS[i]!;
      const cid = uid(`customer-${i}`);
      customerIds.push(cid);
      await sql`
        INSERT INTO customers (id, organization_id, name, contact_name, contact_email, contact_phone, billing_address, type)
        VALUES (${cid}, ${ORG_ID}, ${c.name}, ${c.contact}, ${c.email}, ${c.phone}, ${c.addr}, ${c.type})
        ON CONFLICT (organization_id, name) DO UPDATE SET contact_name = EXCLUDED.contact_name
      `;
    }

    logger.info('seeding trips and trip events...');
    for (let i = 0; i < TRIPS.length; i++) {
      const t = TRIPS[i]!;
      const tid = uid(`trip-${i}`);
      const vid = vehicleIds[t.vehicle]!;
      const did = driverIds[t.driver]!;
      const cid = customerIds[t.cust]!;
      const plannedDep = daysAgo(Math.abs(t.days));
      const plannedArr = new Date(plannedDep.getTime() + (t.dist / 40) * 3600000);
      const fuelEst = (t.dist * t.cargo / 8000).toFixed(2);

      const src = t.src;
      const dest = t.dest!;
      const tripData: Record<string, unknown> = {
        id: tid,
        organization_id: ORG_ID,
        vehicle_id: vid,
        driver_id: did,
        customer_id: cid,
        source_label: src.label,
        source_lat: src.lat,
        source_lng: src.lng,
        destination_label: dest.label,
        destination_lat: dest.lat,
        destination_lng: dest.lng,
        cargo_weight_kg: t.cargo,
        planned_distance_km: t.dist,
        planned_travel_mins: Math.round((t.dist / 40) * 60),
        estimated_fuel_l: fuelEst,
        revenue_amount: Math.round(t.cargo * 1.5),
        status: t.status,
        planned_departure_at: plannedDep,
        planned_arrival_at: plannedArr,
        created_by: adminId,
      };

      if (t.status === 'completed') {
        tripData.dispatched_at = new Date(plannedDep.getTime() - 3600000);
        tripData.started_at = plannedDep;
        tripData.completed_at = plannedArr;
        tripData.actual_distance_km = Math.round(t.dist + (Math.random() - 0.3) * 5);
        tripData.actual_travel_mins = Math.round((t.dist / 40) * 60 + (Math.random() - 0.2) * 30);
      } else if (t.status === 'dispatched') {
        tripData.dispatched_at = daysAgo(0);
      } else if (t.status === 'in-transit') {
        tripData.dispatched_at = daysAgo(0);
        tripData.started_at = new Date(Date.now() - 1800000);
      } else if (t.status === 'cancelled') {
        tripData.cancelled_at = plannedDep;
        tripData.cancel_reason = i === 16 ? 'customer' : 'vehicle_breakdown';
      }

      await sql`
        INSERT INTO trips ${sql(tripData as Record<string, unknown>)}
        ON CONFLICT DO NOTHING
      `;

      // Trip events
      const now = new Date();
      const events = [];
      if (['completed', 'in-transit', 'dispatched'].includes(t.status)) {
        events.push({
          id: uid(`te-${i}-created`),
          trip_id: tid,
          event_type: 'created',
          recorded_by: adminId,
          recorded_at: daysAgo(Math.abs(t.days) + 1),
        });
      }
      if (['completed', 'in-transit', 'dispatched', 'cancelled'].includes(t.status)) {
        if (t.status !== 'draft') {
          events.push({
            id: uid(`te-${i}-dispatched`),
            trip_id: tid,
            event_type: 'dispatched',
            recorded_by: adminId,
            recorded_at: daysAgo(Math.abs(t.days)),
          });
        }
      }
      if (t.status === 'in-transit') {
        events.push({
          id: uid(`te-${i}-started`),
          trip_id: tid,
          event_type: 'enroute',
          lat: t.src.lat + 0.01,
          lng: t.src.lng + 0.01,
          recorded_by: adminId,
          recorded_at: new Date(now.getTime() - 1800000),
        });
      }
      if (t.status === 'completed') {
        events.push({
          id: uid(`te-${i}-completed`),
          trip_id: tid,
          event_type: 'completed',
          recorded_by: adminId,
          recorded_at: plannedArr,
        });
      }
      if (t.status === 'cancelled') {
        events.push({
          id: uid(`te-${i}-cancelled`),
          trip_id: tid,
          event_type: 'cancelled',
          recorded_by: adminId,
          recorded_at: plannedDep,
        });
      }

      for (const ev of events) {
        await sql`
          INSERT INTO trip_events (id, trip_id, event_type, lat, lng, recorded_by, recorded_at)
          VALUES (${ev.id}, ${ev.trip_id}, ${ev.event_type}, ${ev.lat ?? null}, ${ev.lng ?? null}, ${ev.recorded_by}, ${ev.recorded_at})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    logger.info('seeding fuel logs...');
    for (let i = 0; i < 30; i++) {
      const vidx = i % VEHICLES.length;
      const vid = vehicleIds[vidx]!;
      const v = VEHICLES[vidx]!;
      const liters = Math.max(20, Math.floor(20 + Math.random() * 200)).toFixed(2);
      const odo = v.odometer + Math.floor(Math.random() * 5000);
      const isAnomaly = i === 5 || i === 14 || i === 21;
      const insertLiters = isAnomaly ? (parseFloat(liters) * 2.5).toFixed(2) : liters;
      const insertCost = (parseFloat(insertLiters) * 95).toFixed(2);

      await sql`
        INSERT INTO fuel_logs (id, organization_id, vehicle_id, liters, cost, odometer_km, fuel_type, filled_at, created_by)
        VALUES (${uid(`fuel-${i}`)}, ${ORG_ID}, ${vid}, ${insertLiters}, ${insertCost}, ${odo}, ${v.fuel}, ${daysAgo(i * 3 + 1)}, ${uid('user-admin')})
        ON CONFLICT DO NOTHING
      `;
    }

    logger.info('seeding maintenance logs...');
    const maintData = [
      { vid: 0, type: 'oil_change', desc: 'Scheduled 5000km oil change', odo: 50000, cost: 8500, status: 'closed', closed: 90 },
      { vid: 0, type: 'tyre', desc: 'Rear tyre replacement — abnormal wear', odo: 82000, cost: 24000, status: 'closed', closed: 45 },
      { vid: 1, type: 'service', desc: 'Quarterly preventive maintenance', odo: 60000, cost: 12000, status: 'closed', closed: 30 },
      { vid: 3, type: 'repair', desc: 'Brake pad replacement — grinding noise', odo: 41000, cost: 8500, status: 'active', closed: 0 },
      { vid: 4, type: 'inspection', desc: 'Pollution check — renewal due', odo: 30000, cost: 1500, status: 'closed', closed: 15 },
      { vid: 5, type: 'service', desc: '60K major service', odo: 55000, cost: 18500, status: 'closed', closed: 20 },
      { vid: 7, type: 'oil_change', desc: 'Oil change + filter replacement', odo: 95000, cost: 7500, status: 'closed', closed: 60 },
      { vid: 9, type: 'repair', desc: 'AC compressor failure — cabin cooling', odo: 28000, cost: 32000, status: 'active', closed: 0 },
      { vid: 8, type: 'tyre', desc: 'Front tyre alignment + balancing', odo: 72000, cost: 3500, status: 'closed', closed: 10 },
      { vid: 6, type: 'inspection', desc: 'EV battery health check', odo: 15000, cost: 2000, status: 'closed', closed: 5 },
    ];

    for (let i = 0; i < maintData.length; i++) {
      const m = maintData[i]!;
      const closedAt: Date | null = m.closed > 0 ? daysAgo(m.closed) : null;
      const closedBy: string | null = m.closed > 0 ? uid('user-admin') : null;
      await sql`
        INSERT INTO maintenance_logs (id, organization_id, vehicle_id, type, description, service_odometer, cost, vendor, status, closed_at, closed_by, created_by)
        VALUES (${uid(`maint-${i}`)}, ${ORG_ID}, ${vehicleIds[m.vid]!}, ${m.type}, ${m.desc}, ${m.odo}, ${m.cost}, ${i % 2 === 0 ? 'Laxmi Motors' : 'Sri Krishna Garage'}, ${m.status}, ${closedAt as any}, ${closedBy as any}, ${uid('user-admin')})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    logger.info('seeding expenses...');
    const expTypes = ['toll', 'parking', 'toll', 'misc', 'toll', 'parking', 'document', 'toll', 'misc', 'toll', 'parking', 'toll'];
    for (let i = 0; i < expTypes.length; i++) {
      const vidx = i % vehicleIds.length;
      await sql`
        INSERT INTO expenses (id, organization_id, vehicle_id, type, amount, incurred_at, created_by)
        VALUES (${uid(`expense-${i}`)}, ${ORG_ID}, ${vehicleIds[vidx]!}, ${expTypes[i]!}, ${50 + Math.floor(Math.random() * 500)}, ${daysAgo(i * 5 + 2)}, ${uid('user-admin')})
        ON CONFLICT DO NOTHING
      `;
    }

    logger.info('seeding vehicle locations...');
    for (let i = 0; i < vehicleIds.length; i++) {
      const v = VEHICLES[i]!;
      if (v.status === 'retired') continue;
      const lat = 13.0 + (Math.random() - 0.3) * 0.2;
      const lng = 77.55 + Math.random() * 0.2;
      await sql`
        INSERT INTO vehicle_locations (id, vehicle_id, lat, lng, heading, speed_kmph, odometer_km, source, recorded_at)
        VALUES (${uid(`loc-${i}`)}, ${vehicleIds[i]!}, ${lat.toFixed(6)}, ${lng.toFixed(6)}, ${Math.floor(Math.random() * 360)}, ${Math.floor(Math.random() * 60)}, ${v.odometer}, 'device', ${new Date()})
        ON CONFLICT DO NOTHING
      `;
    }

    logger.info('seeding notifications...');
    const notifs = [
      { type: 'license_expiring', priority: 'orange', title: 'License Expiring Soon', message: `Driver Sunil Shetty (DL-KA-2019-7890123) license expires on 2024-07-01.`, role: 'safety_officer' },
      { type: 'maintenance_overdue', priority: 'red', title: 'Maintenance Overdue', message: `Tata Ace Gold (KA-03-GH-3456) has an active maintenance log (brake repair) pending.`, role: 'fleet_manager' },
      { type: 'fuel_anomaly', priority: 'orange', title: 'Fuel Anomaly Detected', message: `Ashok Leyland 2518 recorded unusually high fuel consumption. Deviation: +145%`, role: 'financial_analyst' },
      { type: 'vehicle_stale', priority: 'blue', title: 'Vehicle Not Reporting', message: `Eicher Pro 3015 hasn't pinged in 45 minutes.`, role: 'fleet_manager' },
      { type: 'trip_delayed', priority: 'orange', title: 'Trip ETA Slipped', message: `Tata LPT 1613 on Yelahanka Depot -> Hebbal Junction is 12 min behind schedule.`, role: 'fleet_manager' },
    ];

    for (let i = 0; i < notifs.length; i++) {
      const n = notifs[i]!;
      await sql`
        INSERT INTO notifications (id, organization_id, type, priority, title, message, payload, audience_role, fingerprint)
        VALUES (${uid(`notif-${i}`)}, ${ORG_ID}, ${n.type}, ${n.priority}, ${n.title}, ${n.message}, ${JSON.stringify({})}::jsonb, ${n.role}, ${uid(`fp-notif-${i}`)})
        ON CONFLICT (organization_id, fingerprint) DO NOTHING
      `;
    }

    // ---- Emissions Factors ----
    const factors = [
      { fuel_type: 'diesel', co2_per_l: 2.68, co2_per_kwh: 0, valid_from: '2020-01-01', source: 'IPCC 2006' },
      { fuel_type: 'petrol', co2_per_l: 2.31, co2_per_kwh: 0, valid_from: '2020-01-01', source: 'IPCC 2006' },
      { fuel_type: 'cng', co2_per_l: 1.93, co2_per_kwh: 0, valid_from: '2020-01-01', source: 'IPCC 2006' },
      { fuel_type: 'electric', co2_per_l: 0, co2_per_kwh: 0.7, valid_from: '2020-01-01', source: 'GHG Protocol' },
      { fuel_type: 'hybrid', co2_per_l: 1.5, co2_per_kwh: 0, valid_from: '2020-01-01', source: 'Fleet Avg Estimate' },
    ];
    for (const f of factors) {
      await sql`
        INSERT INTO emissions_factors (id, fuel_type, co2_per_l, co2_per_kwh, valid_from, source)
        VALUES (${uid(`emissions-${f.fuel_type}`)}, ${f.fuel_type}, ${f.co2_per_l}, ${f.co2_per_kwh}, ${f.valid_from}, ${f.source})
        ON CONFLICT DO NOTHING
      `;
    }

    // ---- Default settings ----
    await sql`
      INSERT INTO settings (organization_id, payload)
      VALUES (${ORG_ID}, ${JSON.stringify({
        maintenance: { oil_change_km_threshold: 5000, tyre_rotation_km_threshold: 10000 },
        fuel: { anomaly_deviation_pct: 15, rolling_alpha: 0.3, rolling_min_samples: 5 },
        license: { expire_warn_days: 30 },
      })}::jsonb)
      ON CONFLICT (organization_id) DO UPDATE SET payload = EXCLUDED.payload
    `;

    // ---- Healthz ----
    await sql`
      INSERT INTO healthz (id, checked_at) VALUES (${uid('healthz')}, now())
      ON CONFLICT (id) DO UPDATE SET checked_at = now()
    `;

    logger.info({ vehicles: VEHICLES.length, drivers: DRIVERS.length, customers: CUSTOMERS.length, trips: TRIPS.length, fuel: 30, maintenance: maintData.length, expenses: expTypes.length, geofences: 3, notifications: notifs.length }, 'seed complete');
  } finally {
    await sql.end();
  }
}

seed().catch((_error: unknown) => {
  logger.error({ err: _error }, 'seed failed');
  process.exit(1);
});
