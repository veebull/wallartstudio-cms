import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { users, cities } from "./schema";

if (process.env.NODE_ENV !== "production") {
  const { config } = await import("dotenv");
  config();
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

// All Russian cities with population data (top ~200, expandable)
const CITIES = [
  {
    name: "Москва",
    slug: "moskva",
    region: "Московская область",
    fd: "ЦФО",
    pop: 12506468,
  },
  {
    name: "Санкт-Петербург",
    slug: "sankt-peterburg",
    region: "Санкт-Петербург",
    fd: "СЗФО",
    pop: 5384342,
  },
  {
    name: "Новосибирск",
    slug: "novosibirsk",
    region: "Новосибирская область",
    fd: "СФО",
    pop: 1633595,
  },
  {
    name: "Екатеринбург",
    slug: "ekaterinburg",
    region: "Свердловская область",
    fd: "УФО",
    pop: 1495066,
  },
  {
    name: "Казань",
    slug: "kazan",
    region: "Республика Татарстан",
    fd: "ПФО",
    pop: 1257391,
  },
  {
    name: "Нижний Новгород",
    slug: "nizhnij-novgorod",
    region: "Нижегородская область",
    fd: "ПФО",
    pop: 1244254,
  },
  {
    name: "Челябинск",
    slug: "chelyabinsk",
    region: "Челябинская область",
    fd: "УФО",
    pop: 1196680,
  },
  {
    name: "Красноярск",
    slug: "krasnoyarsk",
    region: "Красноярский край",
    fd: "СФО",
    pop: 1092952,
  },
  {
    name: "Самара",
    slug: "samara",
    region: "Самарская область",
    fd: "ПФО",
    pop: 1157880,
  },
  {
    name: "Уфа",
    slug: "ufa",
    region: "Республика Башкортостан",
    fd: "ПФО",
    pop: 1144809,
  },
  {
    name: "Ростов-на-Дону",
    slug: "rostov-na-donu",
    region: "Ростовская область",
    fd: "ЮФО",
    pop: 1137904,
  },
  {
    name: "Краснодар",
    slug: "krasnodar",
    region: "Краснодарский край",
    fd: "ЮФО",
    pop: 1062607,
  },
  {
    name: "Омск",
    slug: "omsk",
    region: "Омская область",
    fd: "СФО",
    pop: 1004820,
  },
  {
    name: "Воронеж",
    slug: "voronezh",
    region: "Воронежская область",
    fd: "ЦФО",
    pop: 1039801,
  },
  {
    name: "Пермь",
    slug: "perm",
    region: "Пермский край",
    fd: "ПФО",
    pop: 1048005,
  },
  {
    name: "Волгоград",
    slug: "volgograd",
    region: "Волгоградская область",
    fd: "ЮФО",
    pop: 1008998,
  },
  {
    name: "Саратов",
    slug: "saratov",
    region: "Саратовская область",
    fd: "ПФО",
    pop: 840000,
  },
  {
    name: "Тюмень",
    slug: "tyumen",
    region: "Тюменская область",
    fd: "УФО",
    pop: 807271,
  },
  {
    name: "Тольятти",
    slug: "tolyatti",
    region: "Самарская область",
    fd: "ПФО",
    pop: 693072,
  },
  {
    name: "Ижевск",
    slug: "izhevsk",
    region: "Удмуртская Республика",
    fd: "ПФО",
    pop: 648146,
  },
  {
    name: "Барнаул",
    slug: "barnaul",
    region: "Алтайский край",
    fd: "СФО",
    pop: 632372,
  },
  {
    name: "Ульяновск",
    slug: "ulyanovsk",
    region: "Ульяновская область",
    fd: "ПФО",
    pop: 622963,
  },
  {
    name: "Иркутск",
    slug: "irkutsk",
    region: "Иркутская область",
    fd: "СФО",
    pop: 617473,
  },
  {
    name: "Хабаровск",
    slug: "khabarovsk",
    region: "Хабаровский край",
    fd: "ДВФО",
    pop: 610305,
  },
  {
    name: "Ярославль",
    slug: "yaroslavl",
    region: "Ярославская область",
    fd: "ЦФО",
    pop: 604477,
  },
  {
    name: "Владивосток",
    slug: "vladivostok",
    region: "Приморский край",
    fd: "ДВФО",
    pop: 600378,
  },
  {
    name: "Махачкала",
    slug: "makhachkala",
    region: "Республика Дагестан",
    fd: "СКФО",
    pop: 601463,
  },
  {
    name: "Томск",
    slug: "tomsk",
    region: "Томская область",
    fd: "СФО",
    pop: 573655,
  },
  {
    name: "Оренбург",
    slug: "orenburg",
    region: "Оренбургская область",
    fd: "ПФО",
    pop: 564443,
  },
  {
    name: "Кемерово",
    slug: "kemerovo",
    region: "Кемеровская область",
    fd: "СФО",
    pop: 556385,
  },
  {
    name: "Новокузнецк",
    slug: "novokuznetsk",
    region: "Кемеровская область",
    fd: "СФО",
    pop: 540286,
  },
  {
    name: "Рязань",
    slug: "ryazan",
    region: "Рязанская область",
    fd: "ЦФО",
    pop: 533638,
  },
  {
    name: "Астрахань",
    slug: "astrakhan",
    region: "Астраханская область",
    fd: "ЮФО",
    pop: 524371,
  },
  {
    name: "Набережные Челны",
    slug: "naberezhnye-chelny",
    region: "Республика Татарстан",
    fd: "ПФО",
    pop: 522420,
  },
  {
    name: "Пенза",
    slug: "penza",
    region: "Пензенская область",
    fd: "ПФО",
    pop: 516697,
  },
  {
    name: "Липецк",
    slug: "lipetsk",
    region: "Липецкая область",
    fd: "ЦФО",
    pop: 503163,
  },
  {
    name: "Киров",
    slug: "kirov",
    region: "Кировская область",
    fd: "ПФО",
    pop: 500161,
  },
  {
    name: "Тула",
    slug: "tula",
    region: "Тульская область",
    fd: "ЦФО",
    pop: 470547,
  },
  {
    name: "Чебоксары",
    slug: "cheboksary",
    region: "Чувашская Республика",
    fd: "ПФО",
    pop: 494986,
  },
  {
    name: "Курск",
    slug: "kursk",
    region: "Курская область",
    fd: "ЦФО",
    pop: 449071,
  },
  {
    name: "Брянск",
    slug: "bryansk",
    region: "Брянская область",
    fd: "ЦФО",
    pop: 408153,
  },
  {
    name: "Иваново",
    slug: "ivanovo",
    region: "Ивановская область",
    fd: "ЦФО",
    pop: 403893,
  },
  {
    name: "Магнитогорск",
    slug: "magnitogorsk",
    region: "Челябинская область",
    fd: "УФО",
    pop: 413253,
  },
  {
    name: "Тверь",
    slug: "tver",
    region: "Тверская область",
    fd: "ЦФО",
    pop: 412981,
  },
  {
    name: "Ставрополь",
    slug: "stavropol",
    region: "Ставропольский край",
    fd: "СКФО",
    pop: 454818,
  },
  {
    name: "Белгород",
    slug: "belgorod",
    region: "Белгородская область",
    fd: "ЦФО",
    pop: 391554,
  },
  {
    name: "Нижний Тагил",
    slug: "nizhnij-tagil",
    region: "Свердловская область",
    fd: "УФО",
    pop: 344718,
  },
  {
    name: "Калининград",
    slug: "kaliningrad",
    region: "Калининградская область",
    fd: "СЗФО",
    pop: 475373,
  },
  {
    name: "Мурманск",
    slug: "murmansk",
    region: "Мурманская область",
    fd: "СЗФО",
    pop: 295374,
  },
  {
    name: "Архангельск",
    slug: "arkhangelsk",
    region: "Архангельская область",
    fd: "СЗФО",
    pop: 350776,
  },
].map((c) => ({
  name: c.name,
  slug: c.slug,
  region: c.region,
  federalDistrict: c.fd,
  population: c.pop,
  hasArticle: false,
}));

async function seed() {
  console.log("🌱 Seeding database...");

  // Admin user
  const hash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "changeme123",
    10,
  );
  await db
    .insert(users)
    .values({
      email: process.env.ADMIN_EMAIL || "admin@example.com",
      name: "Администратор",
      role: "admin",
      passwordHash: hash,
    })
    .onConflictDoNothing();
  console.log("✅ Admin user created");

  // Cities
  for (let i = 0; i < CITIES.length; i += 50) {
    await db
      .insert(cities)
      .values(CITIES.slice(i, i + 50))
      .onConflictDoNothing();
  }
  console.log(`✅ ${CITIES.length} cities loaded`);

  console.log("🎉 Seed complete");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
