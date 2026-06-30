"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const partnerSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["TOUR_OPERATOR", "HOTEL_CONCIERGE"]),
  invoiceTerms: z.enum(["PREPAY", "POST_PAY"]),
  dualInvoicing: z.coerce.boolean().optional(),
});

export async function createPartner(formData: FormData) {
  const parsed = partnerSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    invoiceTerms: formData.get("invoiceTerms"),
    dualInvoicing: formData.get("dualInvoicing") === "on",
  });

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
