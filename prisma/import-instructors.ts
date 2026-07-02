import { prisma } from "../src/lib/prisma";
import { Discipline, Gender } from "@prisma/client";

const instructors: {
  firstName: string;
  lastName: string;
  gender: Gender;
  disciplines: Discipline[];
  languages: string[];
  offPisteCert: boolean;
  brevet: boolean;
}[] = [
  { firstName: "Adam", lastName: "Caudwell", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Aimee", lastName: "Eymann", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN", "JP", "GER"], offPisteCert: false, brevet: false },
  { firstName: "Alisa", lastName: "Panchenko", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN", "RU"], offPisteCert: false, brevet: false },
  { firstName: "Ana", lastName: "Hristova", gender: "FEMALE", disciplines: ["SKI"], languages: [], offPisteCert: false, brevet: false },
  { firstName: "Carén", lastName: "Peludero", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN", "ES"], offPisteCert: true, brevet: true },
  { firstName: "Chris", lastName: "Hulands", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "David", lastName: "Molina", gender: "MALE", disciplines: ["SKI"], languages: [], offPisteCert: false, brevet: false },
  { firstName: "Elena", lastName: "Kerr", gender: "FEMALE", disciplines: ["SKI"], languages: [], offPisteCert: false, brevet: false },
  { firstName: "Emil", lastName: "Appel", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "DA"], offPisteCert: false, brevet: false },
  { firstName: "Emilie", lastName: "Bertuzzi", gender: "FEMALE", disciplines: ["SKI"], languages: ["FR", "EN"], offPisteCert: false, brevet: false },
  { firstName: "Georgia", lastName: "Fitzgerald", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN", "FR"], offPisteCert: false, brevet: false },
  { firstName: "Gregory", lastName: "Cuche", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "FR"], offPisteCert: true, brevet: true },
  { firstName: "Helena", lastName: "Carroll", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Jack", lastName: "Westcott", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "FR"], offPisteCert: false, brevet: false },
  { firstName: "James", lastName: "Nuttall", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Jenny", lastName: "Berglund", gender: "FEMALE", disciplines: ["SKI"], languages: [], offPisteCert: false, brevet: false },
  { firstName: "Johanna", lastName: "Obermoser", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN", "GER"], offPisteCert: true, brevet: true },
  { firstName: "John", lastName: "Petterson", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "SW", "NO"], offPisteCert: false, brevet: false },
  { firstName: "Jon", lastName: "Loohuis", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "DU"], offPisteCert: false, brevet: false },
  { firstName: "Jon", lastName: "Alsen", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "SW"], offPisteCert: false, brevet: false },
  { firstName: "Josh", lastName: "Glover", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Kate", lastName: "McBride", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Kenta", lastName: "Berglund", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "SW"], offPisteCert: true, brevet: true },
  { firstName: "Laura", lastName: "Porteus", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Lucy", lastName: "Peacock", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Michaela", lastName: "Hlavinkova", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN", "CZ"], offPisteCert: false, brevet: false },
  { firstName: "Nicol", lastName: "Kindness", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Ollie", lastName: "Broke-Smith", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Paul", lastName: "Roux", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "FR"], offPisteCert: false, brevet: false },
  { firstName: "Peter", lastName: "Fuchs", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "GER"], offPisteCert: true, brevet: true },
  { firstName: "Richard", lastName: "Wilson", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Ruby", lastName: "Richards", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Ryan", lastName: "Kerr", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: true, brevet: true },
  { firstName: "Sam", lastName: "Andrews", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Sam", lastName: "Huibers", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "DU"], offPisteCert: false, brevet: false },
  { firstName: "Sam", lastName: "Jephson", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Sean", lastName: "Yates", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "FR"], offPisteCert: false, brevet: false },
  { firstName: "Shea", lastName: "De Lorenzo", gender: "FEMALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Thomas", lastName: "Bielanski", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Thomas", lastName: "Souter", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "FR"], offPisteCert: false, brevet: false },
  { firstName: "Toby", lastName: "Mallock", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: true, brevet: true },
  { firstName: "Tom", lastName: "Waddington", gender: "MALE", disciplines: ["SKI"], languages: ["EN"], offPisteCert: false, brevet: false },
  { firstName: "Tom", lastName: "Paine", gender: "MALE", disciplines: ["SKI"], languages: ["EN", "FR"], offPisteCert: false, brevet: false },
];

async function main() {
  const pv = await prisma.brand.findUniqueOrThrow({ where: { code: "PV" } });

  let upserted = 0;
  for (const inst of instructors) {
    await prisma.instructor.upsert({
      where: { firstName_lastName_brandId: { firstName: inst.firstName, lastName: inst.lastName, brandId: pv.id } },
      update: { gender: inst.gender, disciplines: inst.disciplines, languages: inst.languages, offPisteCert: inst.offPisteCert, brevet: inst.brevet },
      create: { firstName: inst.firstName, lastName: inst.lastName, brandId: pv.id, gender: inst.gender, disciplines: inst.disciplines, languages: inst.languages, offPisteCert: inst.offPisteCert, brevet: inst.brevet },
    });
    upserted++;
  }
  console.log(`Done: ${upserted} upserted`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
