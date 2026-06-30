"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const instructorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  brandId: z.string().uuid(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export async function createInstructor(formData: FormData) {
  const parsed = instructorSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    brandId: formData.get("brandId"),
    mobile: formData.get("mobile") || undefined,
    email: formData.get("email") || undefined,
  });

  await prisma.instructor.create({
    data: {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      brandId: parsed.brandId,
      mobile: parsed.mobile,
      email: parsed.email || undefined,
    },
  });

  revalidatePath("/instructors");
}

export async function setInstructorActive(id: string, isActive: boolean) {
  await prisma.instructor.update({ where: { id }, data: { isActive } });
  revalidatePath("/instructors");
}
