"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BookingStatus, BookingSource } from "@prisma/client";

// ── Booking header ─────────────────────────────────────────────────────────────

const bookingSchema = z.object({
  clientId: z.string().uuid(),
  brandId: z.string().uuid(),
  source: z.nativeEnum(BookingSource),
  partnerId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  meetingPoint: z.string().optional(),
  notes: z.string().optional(),
});

function parseBookingForm(formData: FormData) {
  return bookingSchema.parse({
    clientId: formData.get("clientId"),
    brandId: formData.get("brandId"),
    source: formData.get("source"),
    partnerId: formData.get("partnerId") || "",
    meetingPoint: formData.get("meetingPoint") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createBooking(formData: FormData) {
  const data = parseBookingForm(formData);
  const booking = await prisma.booking.create({
    data: {
      clientId: data.clientId,
      brandId: data.brandId,
      source: data.source,
      partnerId: data.partnerId ?? null,
      meetingPoint: data.meetingPoint ?? null,
      notes: data.notes ?? null,
    },
  });
  redirect(`/bookings/${booking.id}`);
}

export async function updateBooking(formData: FormData) {
  const id = formData.get("id") as string;
  const data = parseBookingForm(formData);
  await prisma.booking.update({
    where: { id },
    data: {
      clientId: data.clientId,
      brandId: data.brandId,
      source: data.source,
      partnerId: data.partnerId ?? null,
      meetingPoint: data.meetingPoint ?? null,
      notes: data.notes ?? null,
    },
  });
  redirect(`/bookings/${id}`);
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  await prisma.booking.update({ where: { id }, data: { status } });
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/bookings");
}

export async function deleteBooking(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.booking.delete({ where: { id } });
  redirect("/bookings");
}

// ── Line items ─────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  bookingId: z.string().uuid(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().optional(),
  durationMin: z.coerce.number().int().positive().optional().nullable(),
  description: z.string().min(1),
  priceChf: z.coerce.number().nonnegative(),
  assignedInstructorId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
});

function parseLineItemForm(formData: FormData) {
  return lineItemSchema.parse({
    bookingId: formData.get("bookingId"),
    date: formData.get("date"),
    startTime: formData.get("startTime") || undefined,
    durationMin: formData.get("durationMin") || undefined,
    description: formData.get("description"),
    priceChf: formData.get("priceChf"),
    assignedInstructorId: formData.get("assignedInstructorId") || "",
  });
}

function buildDates(dateStr: string, timeStr?: string) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  let startTime: Date | null = null;
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    startTime = new Date(
      `${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`
    );
  }
  return { date, startTime };
}

export async function createLineItem(formData: FormData) {
  const data = parseLineItemForm(formData);
  const { date, startTime } = buildDates(data.date, data.startTime);
  await prisma.bookingLineItem.create({
    data: {
      bookingId: data.bookingId,
      date,
      startTime,
      durationMin: data.durationMin ?? null,
      description: data.description,
      priceChf: data.priceChf,
      assignedInstructorId: data.assignedInstructorId ?? null,
    },
  });
  revalidatePath(`/bookings/${data.bookingId}`);
  revalidatePath("/calendar");
}

export async function updateLineItem(formData: FormData) {
  const id = formData.get("id") as string;
  const data = parseLineItemForm(formData);
  const { date, startTime } = buildDates(data.date, data.startTime);
  await prisma.bookingLineItem.update({
    where: { id },
    data: {
      date,
      startTime,
      durationMin: data.durationMin ?? null,
      description: data.description,
      priceChf: data.priceChf,
      assignedInstructorId: data.assignedInstructorId ?? null,
    },
  });
  revalidatePath("/calendar");
  redirect(`/bookings/${data.bookingId}`);
}

// Called from calendar drag & drop — takes typed args, not FormData
export async function moveLineItem(
  id: string,
  instructorId: string | null,
  date: string
) {
  const newDate = new Date(`${date}T00:00:00Z`);
  await prisma.bookingLineItem.update({
    where: { id },
    data: {
      date: newDate,
      assignedInstructorId: instructorId ?? null,
    },
  });
  revalidatePath("/calendar");
  revalidatePath("/bookings");
}

export async function deleteLineItem(formData: FormData) {
  const id = formData.get("id") as string;
  // Look up bookingId so the caller doesn't need to pass it
  const lineItem = await prisma.bookingLineItem.findUniqueOrThrow({
    where: { id },
    select: { bookingId: true },
  });
  await prisma.bookingLineItem.delete({ where: { id } });
  revalidatePath(`/bookings/${lineItem.bookingId}`);
}
