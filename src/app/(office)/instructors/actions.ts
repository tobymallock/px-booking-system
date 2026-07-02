"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Discipline, Gender } from "@prisma/client";

const instructorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  brandId: z.string().uuid(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.nativeEnum(Gender).optional(),
  language: z.string().optional(),
  disciplines: z.array(z.nativeEnum(Discipline)).default([]),
  offPisteCert: z.boolean().default(false),
  brevet: z.boolean().default(false),
});

export async function createInstructor(formData: FormData) {
  const parsed = instructorSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    brandId: formData.get("brandId"),
    mobile: formData.get("mobile") || undefined,
    email: formData.get("email") || undefined,
    gender: formData.get("gender") || undefined,
    language: formData.get("language") || undefined,
    disciplines: formData.getAll("disciplines"),
    offPisteCert: formData.get("offPisteCert") === "on",
    brevet: formData.get("brevet") === "on",
  });

  await prisma.instructor.create({
    data: {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      brandId: parsed.brandId,
      mobile: parsed.mobile,
      email: parsed.email || undefined,
      gender: parsed.gender,
      language: parsed.language,
      disciplines: parsed.disciplines,
      offPisteCert: parsed.offPisteCert,
      brevet: parsed.brevet,
    },
  });

  revalidatePath("/instructors");
}

export async function setInstructorActive(id: string, isActive: boolean) {
  await prisma.instructor.update({ where: { id }, data: { isActive } });
  revalidatePath("/instructors");
}
