/**
 * Admin Bookings API - Server-side helpers for booking management
 * Handles CRUD operations for manual booking creation in admin
 */

import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import type { AdminBookingFormData, AdminBookingResponse, BookingListFilters } from '@/types/admin';
import { Prisma } from '@prisma/client';
import { getAdminSettings } from '@/lib/api/admin-settings';

/**
 * Calculate booking total based on suite price and nights
 */
export async function calculateBookingPrice(
  suiteId: string,
  checkInDate: Date,
  checkOutDate: Date,
): Promise<{ subtotal: number; tax: number; total: number } | null> {
  if (!isDatabaseConfigured()) return null;

  const suite = await prisma.suite.findUnique({
    where: { id: suiteId },
  });

  if (!suite) return null;

  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (nights < 1) return null;

  const settings = await getAdminSettings();
  const taxRate = settings.pricingSettings.taxRatePercent / 100;

  const subtotal = suite.pricePerNight * nights;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + tax;

  return { subtotal, tax, total };
}

/**
 * Create a new booking manually from admin
 */
export async function createAdminBooking(
  data: AdminBookingFormData & { userId: string },
): Promise<AdminBookingResponse | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    // Validate customer exists
    const customer = await prisma.user.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Validate pets exist and belong to customer
    const pets = await prisma.pet.findMany({
      where: {
        id: { in: data.petIds },
        userId: data.customerId,
      },
    });

    if (pets.length !== data.petIds.length) {
      throw new Error('One or more pets not found or do not belong to customer');
    }

    // Validate suite exists and get pricing
    const suite = await prisma.suite.findUnique({
      where: { id: data.suiteId },
    });

    if (!suite) {
      throw new Error('Suite not found');
    }

    // Calculate pricing
    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (nights < 1) {
      throw new Error('Check-out date must be after check-in date');
    }

    const settings = await getAdminSettings();
    const taxRate = settings.pricingSettings.taxRatePercent / 100;

    const subtotal = suite.pricePerNight * nights;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax;

    // Generate booking number
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const bookingNumber = `PB-${dateStr}-${randomNum}`;

    // Create booking with pets
    const booking = await prisma.booking.create({
      data: {
        userId: data.customerId,
        suiteId: data.suiteId,
        bookingNumber,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        totalNights: nights,
        subtotal,
        tax,
        total,
        status: data.autoConfirm ? 'confirmed' : 'pending',
        specialRequests: data.specialRequests,
        bookingPets: {
          create: data.petIds.map((petId) => ({ petId })),
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        suite: { select: { id: true, name: true } },
        bookingPets: {
          include: {
            pet: {
              select: {
                id: true,
                name: true,
                breed: true,
                vaccines: {
                  orderBy: { expiryDate: 'desc' },
                  select: {
                    id: true,
                    name: true,
                    administeredDate: true,
                    expiryDate: true,
                    documentUrl: true,
                  },
                },
                medications: {
                  orderBy: { startDate: 'desc' },
                  select: {
                    id: true,
                    name: true,
                    frequency: true,
                    startDate: true,
                    endDate: true,
                    instructions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return booking as AdminBookingResponse;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

/**
 * Get all bookings with optional filters for admin list view
 */
export async function getAdminBookings(filters?: BookingListFilters): Promise<AdminBookingResponse[]> {
  if (!isDatabaseConfigured()) return [];

  const where: Prisma.BookingWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.suiteId) {
    where.suiteId = filters.suiteId;
  }

  if (filters?.startDate || filters?.endDate) {
    if (filters.startDate && filters.endDate) {
      // Include any booking that overlaps the selected window.
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          checkInDate: {
            lte: filters.endDate,
          },
        },
        {
          checkOutDate: {
            gte: filters.startDate,
          },
        },
      ];
    } else if (filters.startDate) {
      where.checkOutDate = {
        gte: filters.startDate,
      };
    } else if (filters.endDate) {
      where.checkInDate = {
        lte: filters.endDate,
      };
    }
  }

  if (filters?.searchTerm) {
    where.OR = [
      {
        user: {
          name: { contains: filters.searchTerm, mode: 'insensitive' },
        },
      },
      {
        user: {
          email: { contains: filters.searchTerm, mode: 'insensitive' },
        },
      },
      {
        bookingNumber: { contains: filters.searchTerm, mode: 'insensitive' },
      },
    ];
  }

  try {
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        suite: { select: { id: true, name: true } },
        bookingPets: {
          include: {
            pet: {
              select: {
                id: true,
                name: true,
                breed: true,
                vaccines: {
                  orderBy: { expiryDate: 'desc' },
                  select: {
                    id: true,
                    name: true,
                    administeredDate: true,
                    expiryDate: true,
                    documentUrl: true,
                  },
                },
                medications: {
                  orderBy: { startDate: 'desc' },
                  select: {
                    id: true,
                    name: true,
                    frequency: true,
                    startDate: true,
                    endDate: true,
                    instructions: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { checkInDate: 'asc' },
    });

    return bookings as AdminBookingResponse[];
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
}

/**
 * Get a single booking by ID
 */
export async function getAdminBooking(bookingId: string): Promise<AdminBookingResponse | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        suite: { select: { id: true, name: true } },
        bookingPets: {
          include: {
            pet: {
              select: {
                id: true,
                name: true,
                breed: true,
                vaccines: {
                  orderBy: { expiryDate: 'desc' },
                  select: {
                    id: true,
                    name: true,
                    administeredDate: true,
                    expiryDate: true,
                    documentUrl: true,
                  },
                },
                medications: {
                  orderBy: { startDate: 'desc' },
                  select: {
                    id: true,
                    name: true,
                    frequency: true,
                    startDate: true,
                    endDate: true,
                    instructions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return booking as AdminBookingResponse | null;
  } catch (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  bookingId: string,
  status: string,
): Promise<AdminBookingResponse | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        suite: { select: { id: true, name: true } },
        bookingPets: {
          include: {
            pet: { select: { id: true, name: true, breed: true } },
          },
        },
      },
    });

    return booking as AdminBookingResponse;
  } catch (error) {
    console.error('Error updating booking:', error);
    return null;
  }
}

/**
 * Check suite availability for a date range
 */
export async function checkSuiteAvailability(
  suiteId: string,
  checkInDate: Date,
  checkOutDate: Date,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const existingBookings = await prisma.booking.count({
      where: {
        suiteId,
        status: { not: 'cancelled' },
        OR: [
          {
            checkInDate: { lt: checkOutDate },
            checkOutDate: { gt: checkInDate },
          },
        ],
      },
    });

    return existingBookings === 0;
  } catch (error) {
    console.error('Error checking suite availability:', error);
    return false;
  }
}
