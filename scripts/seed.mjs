// ============================================================================
// COMANDA — Seed de dados de demonstração
// Roda com: npm run db:seed  (ou npm run db:reset para recriar do zero)
// ============================================================================
import "./_env.mjs";
import pg from "pg";
import { randomUUID, pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Hash PBKDF2 idêntico ao de src/lib/password.ts — usado para senhas e PINs. */
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[comanda/seed] DATABASE_URL não definida.");
  process.exit(1);
}
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
const ssl =
  process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : process.env.DATABASE_SSL === "false"
      ? false
      : isLocal
        ? false
        : { rejectUnauthorized: false };

const client = new pg.Client({ connectionString, ssl });

console.log("[comanda/seed] ────────────────────────────────────────────");
console.log("[comanda/seed] NODE_ENV     :", process.env.NODE_ENV ?? "(não definido)");
console.log("[comanda/seed] DATABASE_URL :", connectionString.replace(/:[^:@]+@/, ":***@"));
console.log("[comanda/seed] ────────────────────────────────────────────");

// Este script insere usuários de demonstração com SENHAS FIXAS E CONHECIDAS
// (ex.: admin/comanda2025 — ver credenciais impressas no final). Rodar isso
// contra um banco de produção deixaria essas contas ativas e utilizáveis
// por qualquer pessoa que tenha lido este arquivo (ele é público no repo).
// Por segurança, recusamos rodar contra qualquer banco que não pareça ser
// local, a menos que --force seja passado explicitamente.
const forced = process.argv.includes("--force");
if (!isLocal && !forced) {
  console.error("");
  console.error("[ensure-seed] ⛔ RECUSADO: DATABASE_URL não parece ser um banco local.");
  console.error("[ensure-seed]    Este script cria usuários de demonstração com senhas");
  console.error("[ensure-seed]    fixas e públicas (estão neste arquivo). Rodá-lo contra");
  console.error("[ensure-seed]    produção deixaria essas contas ativas e exploráveis.");
  console.error("[ensure-seed]    Se você tem CERTEZA de que quer isso (ex.: ambiente de");
  console.error("[ensure-seed]    staging descartável), rode de novo com: npm run db:seed -- --force");
  console.error("");
  process.exit(1);
}

await client.connect();
await client.query(readFileSync(join(__dirname, "..", "src", "lib", "db", "schema.sql"), "utf-8"));

/** Converte `?` posicionais (estilo SQLite) para `$1, $2, ...` (estilo Postgres). */
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}
async function run(sql, ...params) {
  return client.query(toPg(sql), params);
}
async function get(sql, ...params) {
  const { rows } = await client.query(toPg(sql), params);
  return rows[0];
}

async function insertUser(restaurantId, username, password, displayName, role) {
  const userId = `user_${randomUUID()}`;
  await run(
    `INSERT INTO users (id, username, password_hash, display_name, role, restaurant_id, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, true, ?)
     ON CONFLICT (lower(username)) DO NOTHING`,
    userId, username.toLowerCase(), hashPassword(password), displayName, role, restaurantId, new Date().toISOString()
  );
  return userId;
}

const id = (prefix) => `${prefix}_${randomUUID()}`;
const now = () => new Date().toISOString();
const i18n = (ptBR, en, es) => JSON.stringify({ "pt-BR": ptBR, en, es });

async function insertRestaurant({
  slug, name, tagline, logoIcon, primaryColor, accentColor, serviceFeePct,
  kitchenPin = "1234", financialPin = "1234", adminPin = "1234",
}) {
  const restaurantId = id("rest");
  await run(
    `INSERT INTO restaurants (id, slug, name, tagline, logo_emoji, logo_icon, primary_color, accent_color, default_locale, service_fee_pct, kitchen_pin_hash, financial_pin_hash, admin_pin_hash, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pt-BR', ?, ?, ?, ?, true, ?)`
  , restaurantId, slug, name, tagline, "🍽️", logoIcon, primaryColor, accentColor, serviceFeePct,
    hashPassword(kitchenPin), hashPassword(financialPin), hashPassword(adminPin), now());
  return restaurantId;
}

async function insertCategory(restaurantId, name, position) {
  const categoryId = id("cat");
  await run(
    `INSERT INTO categories (id, restaurant_id, name_i18n, icon, position, created_at)
     VALUES (?, ?, ?, NULL, ?, ?)`
  , categoryId, restaurantId, JSON.stringify(name), position, now());
  return categoryId;
}

async function insertItem(restaurantId, categoryId, item, position) {
  const itemId = id("item");
  await run(
    `INSERT INTO menu_items (id, restaurant_id, category_id, name_i18n, description_i18n, price_cents, image_url, is_available, is_chef_recommendation, prep_time_minutes, tags_json, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, true, ?, ?, ?, ?, ?)`
  , 
    itemId,
    restaurantId,
    categoryId,
    JSON.stringify(item.name),
    JSON.stringify(item.description),
    item.priceCents,
    item.imageUrl ?? null,
    item.chef ? 1 : 0,
    item.prepTime,
    JSON.stringify(item.tags ?? []),
    position,
    now()
  );

  for (const [groupPosition, group] of (item.optionGroups ?? []).entries()) {
    const groupId = id("og");
    await run(
      `INSERT INTO item_option_groups (id, menu_item_id, name_i18n, type, is_required, min_select, max_select, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    , 
      groupId,
      itemId,
      JSON.stringify(group.name),
      group.type,
      group.required ? 1 : 0,
      group.required ? 1 : 0,
      group.maxSelect ?? (group.type === "single" ? 1 : group.choices.length),
      groupPosition
    );

    for (const [choicePosition, choice] of group.choices.entries()) {
      await run(
        `INSERT INTO item_option_choices (id, option_group_id, name_i18n, price_delta_cents, position)
         VALUES (?, ?, ?, ?, ?)`
      , id("oc"), groupId, JSON.stringify(choice.name), choice.priceDeltaCents ?? 0, choicePosition);
    }
  }

  return itemId;
}

async function insertRecommendation(itemId, recommendedItemId) {
  await run(
    `INSERT INTO item_recommendations (menu_item_id, recommended_item_id) VALUES (?, ?) ON CONFLICT DO NOTHING`
  , itemId, recommendedItemId);
}

async function insertTable(restaurantId, label, capacity) {
  const tableId = id("table");
  await run(
    `INSERT INTO restaurant_tables (id, restaurant_id, label, qr_token, capacity, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, true, ?)`
  , tableId, restaurantId, label, randomUUID(), capacity, now());
  return tableId;
}

// ----------------------------------------------------------------------------
// Limpa dados de demonstração anteriores (idempotente — pode rodar várias vezes)
// ----------------------------------------------------------------------------
for (const slug of ["sabor-brasa", "verde-vida"]) {
  const existing = await get("SELECT id FROM restaurants WHERE slug = ?", slug);
  if (existing) {
    await run("DELETE FROM restaurants WHERE id = ?", existing.id);
  }
}

// ============================================================================
// RESTAURANTE 1 — Sabor & Brasa (churrascaria de bairro, identidade quente)
// ============================================================================
const brasaId = await insertRestaurant({
  slug: "sabor-brasa",
  name: "Sabor & Brasa",
  tagline: "Churrasco de boteco, do jeito que tem que ser",
  logoIcon: "flame",
  primaryColor: "#B5482F",
  accentColor: "#2F6B4F",
  serviceFeePct: 10,
});

const brasaEntradas = await insertCategory(
  brasaId,
  { "pt-BR": "Entradas", en: "Starters", es: "Entrantes" },
  0
);
const brasaPrincipais = await insertCategory(
  brasaId,
  { "pt-BR": "Pratos Principais", en: "Main Courses", es: "Platos Principales" },
  1
);
const brasaBebidas = await insertCategory(
  brasaId,
  { "pt-BR": "Bebidas", en: "Drinks", es: "Bebidas" },
  2
);
const brasaSobremesas = await insertCategory(
  brasaId,
  { "pt-BR": "Sobremesas", en: "Desserts", es: "Postres" },
  3
);

const paoDeAlho = await insertItem(
  brasaId,
  brasaEntradas,
  {
    name: i18n("Pão de Alho na Brasa", "Grilled Garlic Bread", "Pan de Ajo a la Brasa") && {
      "pt-BR": "Pão de Alho na Brasa",
      en: "Grilled Garlic Bread",
      es: "Pan de Ajo a la Brasa",
    },
    description: {
      "pt-BR": "Pão artesanal grelhado na brasa com manteiga de alho e ervas frescas.",
      en: "Artisan bread grilled over charcoal with garlic butter and fresh herbs.",
      es: "Pan artesanal a la brasa con mantequilla de ajo y hierbas frescas.",
    },
    priceCents: 1800,
    imageUrl: "https://images.unsplash.com/photo-1619535860434-ba1d8fa72fb0",
    prepTime: 10,
    tags: ["vegetariano"],
  },
  0
);

const bolinhoCostela = await insertItem(
  brasaId,
  brasaEntradas,
  {
    name: { "pt-BR": "Bolinho de Costela", en: "Short Rib Croquettes", es: "Croquetas de Costilla" },
    description: {
      "pt-BR": "Costela desfiada lentamente, empanada e fritinha, com molho barbecue da casa.",
      en: "Slow-cooked shredded short rib, breaded and fried, with house barbecue sauce.",
      es: "Costilla desmenuzada cocida lentamente, empanizada y frita, con salsa barbacoa de la casa.",
    },
    priceCents: 3200,
    imageUrl: "https://images.unsplash.com/photo-1639024471283-03518883512d",
    prepTime: 15,
    chef: true,
    tags: [],
  },
  1
);

const picanha = await insertItem(
  brasaId,
  brasaPrincipais,
  {
    name: { "pt-BR": "Picanha na Brasa (300g)", en: "Grilled Picanha (300g)", es: "Picaña a la Brasa (300g)" },
    description: {
      "pt-BR": "Corte nobre grelhado no ponto que você preferir, acompanhado de farofa e vinagrete.",
      en: "Premium cut grilled to your preferred doneness, served with toasted cassava flour and vinaigrette.",
      es: "Corte premium a la brasa al término que prefieras, acompañado de farofa y vinagreta.",
    },
    priceCents: 8900,
    imageUrl: "https://images.unsplash.com/photo-1432139509613-5c4255815697",
    prepTime: 25,
    chef: true,
    tags: [],
    optionGroups: [
      {
        name: { "pt-BR": "Ponto da carne", en: "Doneness", es: "Término de la carne" },
        type: "single",
        required: true,
        choices: [
          { name: { "pt-BR": "Mal passado", en: "Rare", es: "Poco hecho" } },
          { name: { "pt-BR": "Ao ponto", en: "Medium", es: "Al punto" } },
          { name: { "pt-BR": "Bem passado", en: "Well done", es: "Bien hecho" } },
        ],
      },
      {
        name: { "pt-BR": "Acompanhamentos extras", en: "Extra Sides", es: "Acompañamientos extra" },
        type: "multiple",
        required: false,
        maxSelect: 2,
        choices: [
          { name: { "pt-BR": "Batata rústica", en: "Rustic Potatoes", es: "Papas rústicas" }, priceDeltaCents: 1200 },
          { name: { "pt-BR": "Arroz branco", en: "White Rice", es: "Arroz blanco" } },
          { name: { "pt-BR": "Farofa extra", en: "Extra Cassava Flour", es: "Farofa extra" } },
        ],
      },
    ],
  },
  0
);

const costela12h = await insertItem(
  brasaId,
  brasaPrincipais,
  {
    name: { "pt-BR": "Costela Bovina 12h", en: "12h Slow-Cooked Beef Ribs", es: "Costilla de Res 12h" },
    description: {
      "pt-BR": "Costela cozida lentamente por 12 horas até desmanchar, finalizada na brasa.",
      en: "Beef ribs slow-cooked for 12 hours until tender, finished over charcoal.",
      es: "Costilla cocida lentamente por 12 horas hasta deshacerse, finalizada a la brasa.",
    },
    priceCents: 7600,
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947",
    prepTime: 20,
    tags: [],
  },
  1
);

const risoto = await insertItem(
  brasaId,
  brasaPrincipais,
  {
    name: { "pt-BR": "Risoto de Cogumelos", en: "Mushroom Risotto", es: "Risotto de Hongos" },
    description: {
      "pt-BR": "Arroz arbóreo cremoso com mix de cogumelos frescos e parmesão.",
      en: "Creamy arborio rice with a mix of fresh mushrooms and parmesan.",
      es: "Arroz arbóreo cremoso con mezcla de hongos frescos y parmesano.",
    },
    priceCents: 5800,
    imageUrl: "https://images.unsplash.com/photo-1476124369491-e7addf5db371",
    prepTime: 22,
    tags: ["vegetariano"],
  },
  2
);

const hamburguer = await insertItem(
  brasaId,
  brasaPrincipais,
  {
    name: { "pt-BR": "Hambúrguer Artesanal Brasa", en: "Brasa Artisan Burger", es: "Hamburguesa Artesanal Brasa" },
    description: {
      "pt-BR": "Blend 180g grelhado na brasa, pão brioche e maionese da casa.",
      en: "180g charcoal-grilled blend patty, brioche bun and house mayo.",
      es: "Blend de 180g a la brasa, pan brioche y mayonesa de la casa.",
    },
    priceCents: 4200,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    prepTime: 18,
    tags: [],
    optionGroups: [
      {
        name: { "pt-BR": "Adicionais", en: "Add-ons", es: "Adicionales" },
        type: "multiple",
        required: false,
        maxSelect: 3,
        choices: [
          { name: { "pt-BR": "Bacon", en: "Bacon", es: "Tocino" }, priceDeltaCents: 800 },
          { name: { "pt-BR": "Queijo extra", en: "Extra Cheese", es: "Queso extra" }, priceDeltaCents: 600 },
          { name: { "pt-BR": "Ovo", en: "Egg", es: "Huevo" }, priceDeltaCents: 500 },
          { name: { "pt-BR": "Cebola caramelizada", en: "Caramelized Onion", es: "Cebolla caramelizada" } },
        ],
      },
    ],
  },
  3
);

await insertItem(
  brasaId,
  brasaBebidas,
  {
    name: { "pt-BR": "Suco Natural de Laranja", en: "Fresh Orange Juice", es: "Jugo Natural de Naranja" },
    description: {
      "pt-BR": "Suco de laranja espremido na hora, sem adição de açúcar.",
      en: "Freshly squeezed orange juice, no added sugar.",
      es: "Jugo de naranja recién exprimido, sin azúcar añadida.",
    },
    priceCents: 1200,
    imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba",
    prepTime: 5,
    tags: ["vegano"],
  },
  0
);

await insertItem(
  brasaId,
  brasaBebidas,
  {
    name: { "pt-BR": "Água com Gás", en: "Sparkling Water", es: "Agua con Gas" },
    description: {
      "pt-BR": "Garrafa 500ml bem gelada.",
      en: "Well-chilled 500ml bottle.",
      es: "Botella de 500ml bien fría.",
    },
    priceCents: 700,
    imageUrl: null,
    prepTime: 2,
    tags: [],
  },
  1
);

const caipirinha = await insertItem(
  brasaId,
  brasaBebidas,
  {
    name: { "pt-BR": "Caipirinha de Limão", en: "Lime Caipirinha", es: "Caipiriña de Limón" },
    description: {
      "pt-BR": "A clássica brasileira, com cachaça artesanal e limão fresco.",
      en: "The Brazilian classic, with artisan cachaça and fresh lime.",
      es: "La clásica brasileña, con cachaça artesanal y limón fresco.",
    },
    priceCents: 2400,
    imageUrl: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a",
    prepTime: 8,
    tags: ["alcoólico"],
  },
  2
);

await insertItem(
  brasaId,
  brasaBebidas,
  {
    name: { "pt-BR": "Refrigerante Lata", en: "Canned Soda", es: "Refresco en Lata" },
    description: { "pt-BR": "350ml, diversos sabores.", en: "350ml, assorted flavors.", es: "350ml, varios sabores." },
    priceCents: 800,
    imageUrl: null,
    prepTime: 2,
    tags: [],
  },
  3
);

const petitGateau = await insertItem(
  brasaId,
  brasaSobremesas,
  {
    name: { "pt-BR": "Petit Gateau com Sorvete", en: "Petit Gateau with Ice Cream", es: "Petit Gateau con Helado" },
    description: {
      "pt-BR": "Bolinho de chocolate quente com recheio cremoso e sorvete de creme.",
      en: "Warm chocolate cake with a gooey center and vanilla ice cream.",
      es: "Pastelito de chocolate caliente con relleno cremoso y helado de crema.",
    },
    priceCents: 2800,
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c",
    prepTime: 15,
    chef: true,
    tags: ["vegetariano"],
  },
  0
);

await insertItem(
  brasaId,
  brasaSobremesas,
  {
    name: { "pt-BR": "Pudim de Leite", en: "Caramel Flan", es: "Flan de Leche" },
    description: {
      "pt-BR": "Receita de família, cremoso e com calda de caramelo.",
      en: "Family recipe, creamy with caramel sauce.",
      es: "Receta familiar, cremoso y con salsa de caramelo.",
    },
    priceCents: 1800,
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777",
    prepTime: 5,
    tags: ["vegetariano"],
  },
  1
);

const linguicaAcebolada = await insertItem(
  brasaId,
  brasaEntradas,
  {
    name: { "pt-BR": "Linguiça Acebolada", en: "Sausage with Onions", es: "Embutido con Cebolla" },
    description: {
      "pt-BR": "Linguiça artesanal grelhada na brasa com cebolas caramelizadas.",
      en: "Artisan sausage grilled over charcoal with caramelized onions.",
      es: "Embutido artesanal a la brasa con cebollas caramelizadas.",
    },
    priceCents: 2600,
    imageUrl: "https://images.unsplash.com/photo-1612871689353-cccf581d667b",
    prepTime: 12,
    tags: [],
  },
  2
);

await insertItem(
  brasaId,
  brasaEntradas,
  {
    name: { "pt-BR": "Queijo Coalho na Brasa", en: "Grilled Coalho Cheese", es: "Queso Coalho a la Brasa" },
    description: {
      "pt-BR": "Espetinhos de queijo coalho grelhados, servidos com melaço de cana.",
      en: "Grilled coalho cheese skewers, served with cane molasses.",
      es: "Brochetas de queso coalho a la brasa, servidas con melaza de caña.",
    },
    priceCents: 2400,
    imageUrl: "https://images.unsplash.com/photo-1628294895950-9805252327bc",
    prepTime: 10,
    tags: ["vegetariano"],
  },
  3
);

const baiao = await insertItem(
  brasaId,
  brasaPrincipais,
  {
    name: { "pt-BR": "Baião de Dois com Carne Seca", en: "Baião de Dois with Dried Beef", es: "Baião de Dois con Carne Seca" },
    description: {
      "pt-BR": "Arroz e feijão de corda com carne seca desfiada, queijo coalho e coentro.",
      en: "Rice and black-eyed peas with shredded dried beef, coalho cheese and cilantro.",
      es: "Arroz y frijoles con carne seca desmenuzada, queso coalho y cilantro.",
    },
    priceCents: 5400,
    imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d",
    prepTime: 22,
    tags: [],
  },
  4
);

const frangoGrelhado = await insertItem(
  brasaId,
  brasaPrincipais,
  {
    name: { "pt-BR": "Frango Grelhado com Ervas", en: "Herb-Grilled Chicken", es: "Pollo a la Parrilla con Hierbas" },
    description: {
      "pt-BR": "Filé de frango marinado em ervas finas, grelhado na brasa, com legumes salteados.",
      en: "Chicken breast marinated in fine herbs, charcoal-grilled, with sautéed vegetables.",
      es: "Pechuga de pollo marinada en finas hierbas, a la brasa, con verduras salteadas.",
    },
    priceCents: 4600,
    imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435",
    prepTime: 20,
    tags: ["sem-gluten"],
  },
  5
);

const cupimNaBrasa = await insertItem(
  brasaId,
  brasaPrincipais,
  {
    name: { "pt-BR": "Cupim na Brasa (350g)", en: "Grilled Hump Steak (350g)", es: "Cupim a la Brasa (350g)" },
    description: {
      "pt-BR": "Corte macio e suculento, assado lentamente na brasa por horas.",
      en: "Tender, juicy cut, slow-roasted over charcoal for hours.",
      es: "Corte tierno y jugoso, asado lentamente a la brasa por horas.",
    },
    priceCents: 7200,
    imageUrl: "https://images.unsplash.com/photo-1558030006-450675393462",
    prepTime: 30,
    tags: [],
  },
  6
);

await insertItem(
  brasaId,
  brasaBebidas,
  {
    name: { "pt-BR": "Chopp Artesanal", en: "Craft Draft Beer", es: "Cerveza Artesanal de Barril" },
    description: {
      "pt-BR": "Chopp pilsen gelado, direto da torneira.",
      en: "Cold pilsen draft beer, straight from the tap.",
      es: "Cerveza pilsen fría, directa del grifo.",
    },
    priceCents: 1600,
    imageUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9",
    prepTime: 3,
    tags: ["alcoólico"],
  },
  4
);

await insertItem(
  brasaId,
  brasaBebidas,
  {
    name: { "pt-BR": "Suco de Maracujá", en: "Passion Fruit Juice", es: "Jugo de Maracuyá" },
    description: {
      "pt-BR": "Suco natural de maracujá, doce na medida certa.",
      en: "Natural passion fruit juice, just the right sweetness.",
      es: "Jugo natural de maracuyá, con el dulzor justo.",
    },
    priceCents: 1200,
    imageUrl: "https://images.unsplash.com/photo-1546173159-315724a31696",
    prepTime: 5,
    tags: ["vegano"],
  },
  5
);

await insertItem(
  brasaId,
  brasaSobremesas,
  {
    name: { "pt-BR": "Banana Caramelizada com Sorvete", en: "Caramelized Banana with Ice Cream", es: "Plátano Caramelizado con Helado" },
    description: {
      "pt-BR": "Banana grelhada na manteiga com canela, calda de caramelo e sorvete de creme.",
      en: "Butter-grilled banana with cinnamon, caramel sauce and vanilla ice cream.",
      es: "Plátano a la mantequilla con canela, salsa de caramelo y helado de crema.",
    },
    priceCents: 2200,
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777",
    prepTime: 10,
    tags: ["vegetariano"],
  },
  2
);

await insertRecommendation(picanha, caipirinha);
await insertRecommendation(picanha, petitGateau);
await insertRecommendation(hamburguer, picanha);

for (const [i, label] of ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Mesa 6", "Mesa 7", "Mesa 8"].entries()) {
  await insertTable(brasaId, label, [2, 2, 4, 4, 4, 6, 2, 4][i]);
}

// ============================================================================
// RESTAURANTE 2 — Verde Vida (bowls e saladas, identidade fresca)
// ============================================================================
const verdeId = await insertRestaurant({
  slug: "verde-vida",
  name: "Verde Vida",
  tagline: "Comida de verdade, leve e saborosa",
  logoIcon: "leaf",
  primaryColor: "#3F7D5C",
  accentColor: "#D98E3B",
  serviceFeePct: 0,
});

const verdeBowls = await insertCategory(verdeId, { "pt-BR": "Bowls", en: "Bowls", es: "Bowls" }, 0);
const verdeSaladas = await insertCategory(verdeId, { "pt-BR": "Saladas", en: "Salads", es: "Ensaladas" }, 1);
const verdeSucos = await insertCategory(
  verdeId,
  { "pt-BR": "Sucos & Smoothies", en: "Juices & Smoothies", es: "Jugos y Batidos" },
  2
);
const verdeDoces = await insertCategory(
  verdeId,
  { "pt-BR": "Doces Saudáveis", en: "Healthy Sweets", es: "Dulces Saludables" },
  3
);

const bowlTropical = await insertItem(
  verdeId,
  verdeBowls,
  {
    name: { "pt-BR": "Bowl Tropical", en: "Tropical Bowl", es: "Bowl Tropical" },
    description: {
      "pt-BR": "Açaí cremoso com banana, manga, granola crocante e mel.",
      en: "Creamy açaí with banana, mango, crunchy granola and honey.",
      es: "Açaí cremoso con plátano, mango, granola crujiente y miel.",
    },
    priceCents: 2600,
    imageUrl: "https://images.unsplash.com/photo-1490323467024-7e9d2ae18d4d",
    prepTime: 8,
    chef: true,
    tags: ["vegano", "sem-gluten"],
    optionGroups: [
      {
        name: { "pt-BR": "Tamanho", en: "Size", es: "Tamaño" },
        type: "single",
        required: true,
        choices: [
          { name: { "pt-BR": "Pequeno (300ml)", en: "Small (300ml)", es: "Pequeño (300ml)" } },
          { name: { "pt-BR": "Médio (450ml)", en: "Medium (450ml)", es: "Mediano (450ml)" }, priceDeltaCents: 600 },
          { name: { "pt-BR": "Grande (600ml)", en: "Large (600ml)", es: "Grande (600ml)" }, priceDeltaCents: 1200 },
        ],
      },
    ],
  },
  0
);

await insertItem(
  verdeId,
  verdeBowls,
  {
    name: { "pt-BR": "Bowl Power Proteico", en: "Protein Power Bowl", es: "Bowl Power Proteico" },
    description: {
      "pt-BR": "Quinoa, grão-de-bico, abacate e folhas verdes com proteína a sua escolha.",
      en: "Quinoa, chickpeas, avocado and greens with your choice of protein.",
      es: "Quinoa, garbanzos, aguacate y verdes con la proteína de tu elección.",
    },
    priceCents: 3400,
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
    prepTime: 12,
    tags: ["sem-gluten"],
    optionGroups: [
      {
        name: { "pt-BR": "Proteína", en: "Protein", es: "Proteína" },
        type: "single",
        required: true,
        choices: [
          { name: { "pt-BR": "Frango grelhado", en: "Grilled Chicken", es: "Pollo a la parrilla" } },
          { name: { "pt-BR": "Tofu grelhado", en: "Grilled Tofu", es: "Tofu a la parrilla" } },
          { name: { "pt-BR": "Sem proteína", en: "No Protein", es: "Sin proteína" }, priceDeltaCents: -800 },
        ],
      },
    ],
  },
  1
);

const saladaCaesar = await insertItem(
  verdeId,
  verdeSaladas,
  {
    name: { "pt-BR": "Salada Caesar Vegana", en: "Vegan Caesar Salad", es: "Ensalada César Vegana" },
    description: {
      "pt-BR": "Alface crespa, croutons artesanais e molho caesar 100% vegetal.",
      en: "Crisp lettuce, artisan croutons and a 100% plant-based caesar dressing.",
      es: "Lechuga crespa, croutons artesanales y aderezo césar 100% vegetal.",
    },
    priceCents: 2900,
    imageUrl: "https://images.unsplash.com/photo-1551248429-40975aa4de74",
    prepTime: 10,
    tags: ["vegano"],
    optionGroups: [
      {
        name: { "pt-BR": "Adicionais", en: "Add-ons", es: "Adicionales" },
        type: "multiple",
        required: false,
        maxSelect: 2,
        choices: [
          { name: { "pt-BR": "Parmesão vegano", en: "Vegan Parmesan", es: "Parmesano vegano" }, priceDeltaCents: 500 },
          { name: { "pt-BR": "Frango grelhado", en: "Grilled Chicken", es: "Pollo a la parrilla" }, priceDeltaCents: 900 },
        ],
      },
    ],
  },
  0
);

await insertItem(
  verdeId,
  verdeSaladas,
  {
    name: { "pt-BR": "Salada Mediterrânea", en: "Mediterranean Salad", es: "Ensalada Mediterránea" },
    description: {
      "pt-BR": "Tomate, pepino, azeitonas, queijo feta e molho de azeite e limão.",
      en: "Tomato, cucumber, olives, feta cheese and an olive oil-lemon dressing.",
      es: "Tomate, pepino, aceitunas, queso feta y aderezo de aceite de oliva y limón.",
    },
    priceCents: 3100,
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999",
    prepTime: 10,
    tags: ["vegetariano"],
  },
  1
);

const sucoVerde = await insertItem(
  verdeId,
  verdeSucos,
  {
    name: { "pt-BR": "Suco Verde Detox", en: "Green Detox Juice", es: "Jugo Verde Detox" },
    description: {
      "pt-BR": "Couve, maçã, limão e gengibre. Refrescante e revigorante.",
      en: "Kale, apple, lime and ginger. Refreshing and revitalizing.",
      es: "Col rizada, manzana, limón y jengibre. Refrescante y revitalizante.",
    },
    priceCents: 1400,
    imageUrl: "https://images.unsplash.com/photo-1610970881699-44a5587cabec",
    prepTime: 5,
    chef: true,
    tags: ["vegano"],
  },
  0
);

await insertItem(
  verdeId,
  verdeSucos,
  {
    name: { "pt-BR": "Smoothie de Frutas Vermelhas", en: "Berry Smoothie", es: "Batido de Frutos Rojos" },
    description: {
      "pt-BR": "Morango, framboesa e mirtilo batidos com leite de coco.",
      en: "Strawberry, raspberry and blueberry blended with coconut milk.",
      es: "Fresa, frambuesa y arándano licuados con leche de coco.",
    },
    priceCents: 1600,
    imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625",
    prepTime: 6,
    tags: ["vegano"],
  },
  1
);

await insertItem(
  verdeId,
  verdeSucos,
  {
    name: { "pt-BR": "Água de Coco Natural", en: "Natural Coconut Water", es: "Agua de Coco Natural" },
    description: {
      "pt-BR": "Servida no coco gelado, direto da fonte.",
      en: "Served chilled in the coconut, straight from the source.",
      es: "Servida fría en el coco, directo de la fuente.",
    },
    priceCents: 900,
    imageUrl: "https://images.unsplash.com/photo-1520950237264-3ee0a82be58d",
    prepTime: 2,
    tags: ["vegano"],
  },
  2
);

await insertItem(
  verdeId,
  verdeDoces,
  {
    name: { "pt-BR": "Brownie Funcional", en: "Functional Brownie", es: "Brownie Funcional" },
    description: {
      "pt-BR": "Sem açúcar refinado, com cacau 70% e castanhas.",
      en: "No refined sugar, made with 70% cocoa and nuts.",
      es: "Sin azúcar refinada, con cacao 70% y nueces.",
    },
    priceCents: 1500,
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c",
    prepTime: 4,
    tags: ["vegano"],
  },
  0
);

await insertItem(
  verdeId,
  verdeDoces,
  {
    name: { "pt-BR": "Bolo de Cenoura Fit", en: "Fit Carrot Cake", es: "Pastel de Zanahoria Fit" },
    description: {
      "pt-BR": "Fofinho, com cobertura de chocolate 70% e sem farinha branca.",
      en: "Fluffy, topped with 70% chocolate and made without white flour.",
      es: "Esponjoso, con cobertura de chocolate 70% y sin harina blanca.",
    },
    priceCents: 1400,
    imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187",
    prepTime: 4,
    tags: ["vegetariano"],
  },
  1
);

const bowlAcai = await insertItem(
  verdeId,
  verdeBowls,
  {
    name: { "pt-BR": "Bowl Verde Detox", en: "Green Detox Bowl", es: "Bowl Verde Detox" },
    description: {
      "pt-BR": "Base de espinafre com manga, kiwi, chia e granola sem glúten.",
      en: "Spinach base with mango, kiwi, chia seeds and gluten-free granola.",
      es: "Base de espinaca con mango, kiwi, chía y granola sin gluten.",
    },
    priceCents: 2800,
    imageUrl: "https://images.unsplash.com/photo-1494597564530-871f2b93ac55",
    prepTime: 8,
    tags: ["vegano", "sem-gluten"],
  },
  2
);

await insertItem(
  verdeId,
  verdeSaladas,
  {
    name: { "pt-BR": "Salada de Grão-de-Bico", en: "Chickpea Salad", es: "Ensalada de Garbanzos" },
    description: {
      "pt-BR": "Grão-de-bico temperado, tomate cereja, pepino e hortelã com molho de limão.",
      en: "Seasoned chickpeas, cherry tomato, cucumber and mint with lemon dressing.",
      es: "Garbanzos sazonados, tomate cherry, pepino y menta con aderezo de limón.",
    },
    priceCents: 2700,
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
    prepTime: 8,
    tags: ["vegano"],
  },
  2
);

const wrapFrango = await insertItem(
  verdeId,
  verdeSaladas,
  {
    name: { "pt-BR": "Wrap de Frango com Húmus", en: "Chicken Hummus Wrap", es: "Wrap de Pollo con Hummus" },
    description: {
      "pt-BR": "Tortilha integral recheada com frango grelhado, húmus, alface e tomate seco.",
      en: "Whole-wheat tortilla filled with grilled chicken, hummus, lettuce and sun-dried tomato.",
      es: "Tortilla integral rellena de pollo a la parrilla, hummus, lechuga y tomate seco.",
    },
    priceCents: 3300,
    imageUrl: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f",
    prepTime: 10,
    tags: [],
  },
  3
);

await insertItem(
  verdeId,
  verdeSucos,
  {
    name: { "pt-BR": "Suco de Abacaxi com Hortelã", en: "Pineapple Mint Juice", es: "Jugo de Piña con Menta" },
    description: {
      "pt-BR": "Abacaxi fresco batido com folhas de hortelã.",
      en: "Fresh pineapple blended with mint leaves.",
      es: "Piña fresca licuada con hojas de menta.",
    },
    priceCents: 1300,
    imageUrl: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8",
    prepTime: 5,
    tags: ["vegano"],
  },
  3
);

await insertItem(
  verdeId,
  verdeSucos,
  {
    name: { "pt-BR": "Chá Gelado de Hibisco", en: "Iced Hibiscus Tea", es: "Té Helado de Hibisco" },
    description: {
      "pt-BR": "Chá de hibisco gelado, levemente adoçado com mel.",
      en: "Iced hibiscus tea, lightly sweetened with honey.",
      es: "Té de hibisco helado, ligeramente endulzado con miel.",
    },
    priceCents: 1100,
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc",
    prepTime: 4,
    tags: ["vegetariano"],
  },
  4
);

await insertItem(
  verdeId,
  verdeDoces,
  {
    name: { "pt-BR": "Energy Balls de Tâmara", en: "Date Energy Balls", es: "Bolitas Energéticas de Dátil" },
    description: {
      "pt-BR": "Bolinhas de tâmara, castanha-do-pará e cacau, sem açúcar adicionado.",
      en: "Date, brazil nut and cocoa bites, no added sugar.",
      es: "Bolitas de dátil, castaña de Pará y cacao, sin azúcar añadida.",
    },
    priceCents: 1200,
    imageUrl: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d",
    prepTime: 3,
    tags: ["vegano", "sem-gluten"],
  },
  2
);

await insertRecommendation(bowlTropical, sucoVerde);
await insertRecommendation(saladaCaesar, sucoVerde);

for (const [i, label] of ["Mesa 1", "Mesa 2", "Mesa 3", "Balcão 1", "Balcão 2", "Mesa 4"].entries()) {
  await insertTable(verdeId, label, [2, 2, 4, 1, 1, 4][i]);
}

// ── Usuários do sistema ─────────────────────────────────────────────────────
// Limpa usuários de demo anteriores para re-seed idempotente
await run("DELETE FROM users WHERE username IN ('admin','gerente.brasa','gerente.verde','garcom.ana','garcom.carlos')");

// Superadmin da plataforma
await insertUser(null, "admin", "comanda2025", "Administrador", "superadmin");

// Managers de cada restaurante
await insertUser(brasaId, "gerente.brasa", "brasa123", "Gerente Sabor & Brasa", "manager");
await insertUser(verdeId, "gerente.verde", "verde123", "Gerente Verde Vida", "manager");

// Garçons de demonstração
await insertUser(brasaId, "garcom.ana",    "senha123", "Ana Silva",    "waiter");
await insertUser(brasaId, "garcom.carlos", "senha123", "Carlos Souza", "waiter");
await insertUser(verdeId, "garcom.julia",  "senha123", "Júlia Martins","waiter");

console.log("✅ Seed concluído:");
console.log(`   • Sabor & Brasa (sabor-brasa) — ${8} mesas`);
console.log(`   • Verde Vida (verde-vida) — ${6} mesas`);
console.log("");
console.log("   Credenciais de acesso:");
console.log("   ┌─────────────────────┬─────────────────┬──────────────┐");
console.log("   │ Usuário             │ Senha           │ Papel        │");
console.log("   ├─────────────────────┼─────────────────┼──────────────┤");
console.log("   │ admin               │ comanda2025     │ Superadmin   │");
console.log("   │ gerente.brasa       │ brasa123        │ Manager      │");
console.log("   │ gerente.verde       │ verde123        │ Manager      │");
console.log("   │ garcom.ana          │ senha123        │ Garçom       │");
console.log("   │ garcom.carlos       │ senha123        │ Garçom       │");
console.log("   └─────────────────────┴─────────────────┴──────────────┘");
console.log(`\nBanco de dados: ${connectionString.replace(/:[^:@]+@/, ":***@")}`);

await client.end();
