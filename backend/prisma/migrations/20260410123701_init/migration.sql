-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL
);

-- CreateTable
CREATE TABLE "Train" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStation" TEXT NOT NULL,
    "toStation" TEXT NOT NULL,
    "totalSeats" INTEGER NOT NULL DEFAULT 500,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "TrainRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "stopNumber" INTEGER NOT NULL,
    "arrivalTime" TEXT,
    "departureTime" TEXT,
    "distanceFromOrigin" INTEGER NOT NULL DEFAULT 0,
    "platform" TEXT NOT NULL DEFAULT '1',
    "haltMinutes" INTEGER NOT NULL DEFAULT 2,
    CONSTRAINT "TrainRoute_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "Train" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrainRoute_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pnr" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainId" TEXT NOT NULL,
    "journeyDate" TEXT NOT NULL,
    "fromStation" TEXT NOT NULL,
    "toStation" TEXT NOT NULL,
    "seatClass" TEXT NOT NULL,
    "totalPassengers" INTEGER NOT NULL,
    "totalFare" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Confirmed',
    "paymentStatus" TEXT NOT NULL DEFAULT 'Paid',
    "coachNumber" TEXT,
    "seatNumbers" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "Train" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "seatNumber" TEXT,
    CONSTRAINT "Passenger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Delay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delay_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "Train" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FoodVendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "rating" REAL NOT NULL DEFAULT 4.0,
    "imageUrl" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "FoodVendor_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "FoodItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "FoodVendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FoodOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Placed',
    "coachSeat" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FoodOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FoodOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "FoodVendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Station_code_key" ON "Station"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Train_trainNumber_key" ON "Train"("trainNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrainRoute_trainId_stationId_key" ON "TrainRoute"("trainId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainRoute_trainId_stopNumber_key" ON "TrainRoute"("trainId", "stopNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_pnr_key" ON "Booking"("pnr");

-- CreateIndex
CREATE UNIQUE INDEX "Delay_trainId_date_key" ON "Delay"("trainId", "date");
