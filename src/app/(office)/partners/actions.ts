"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const partnerSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["TOUR_OPERATOR", "HOTEL_CONCIERGE"]),
  invoiceTerms: z.enum(["PREPAY", "POST_PAY"]),
  dualInvoicing: z.coerce.boolean().optional(),
});

function parsePartnerForm(formData: FormData) {
  return partnerSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    invoiceTerms: formData.get("invoiceTerms"),
    dualInvoicing: formData.get("dualInvoicing") === "on",
  });
}

export async function createPartner(formData: FormData) {
  const parsed = parsePartnerForm(formData);
  await prisma.partner.create({
    data: {
      name: parsed.name,
      type: parsed.type,
      invoiceTerms: parsed.invoiceTerms,
      dualInvoicing: parsed.dualInvoicing ?? false,
    },
  });
  revalidatePath("/partners");
}

export async function updatePartner(formData: FormData) {
  const id = formData.get("id") as string;
  const parsed = parsePartnerForm(formData);
  await prisma.partner.update({
    where: { id },
    data: {
      name: parsed.name,
      type: parsed.type,
      invoiceTerms: parsed.invoiceTerms,
      dualInvoicing: parsed.dualInvoicing ?? false,
    },
  });
  revalidatePath("/partners");
  redirect("/partners");
}

export async function deletePartner(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.partner.delete({ where: { id } });
  revalidatePath("/partners");
  redirect("/partners");
}

const commissionSchema = z.object({
  partnerId: z.string().uuid(),
  brandId: z.string().uuid(),
  ratePct: z.coerce.number().min(0).max(100),
});

export async function setCommissionRate(formData: FormData) {
  const parsed = commissionSchema.parse({
    partnerId: formData.get("partnerId"),
    brandId: formData.get("brandId"),
    ratePct: formData.get("ratePct"),
  });

  await prisma.commissionRate.upsert({
    where: { partnerId_brandId: { partnerId: parsed.partnerId, brandId: parsed.brandId } },
    update: { ratePct: parsed.ratePct },
    create: parsed,
  });

  revalidatePath("/partners");
}
