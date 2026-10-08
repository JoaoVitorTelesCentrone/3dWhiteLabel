import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomInt, randomUUID } from "node:crypto";

const DEMO = {
  slug: "demo",
  host: "demo.localhost",
  email: "demo@agencia3d.local",
  ownerName: "Ana Martins",
  tenantName: "Agencia 3D Demo",
  skuPrefix: "A3D-DEMO-26",
};

function fail(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function insert(admin, table, rows) {
  const { data, error } = await admin.from(table).insert(rows).select();
  fail(error, `Falha ao inserir ${table}`);
  return data ?? [];
}

async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  fail(error, `Falha em ${name}`);
  return data;
}

function daysAgo(days, hour = 12) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, randomInt(0, 60), 0, 0);
  return date.toISOString();
}

function daysAgoDate(days) {
  return daysAgo(days).slice(0, 10);
}

async function main() {
  process.loadEnvFile("../../.env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !serviceKey || !publishableKey) {
    throw new Error("Configure URL, publishable key e secret key no arquivo .env.local da raiz.");
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  let userId;
  let tenantId;
  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  fail(usersError, "Falha ao consultar usuário demo");
  const existingUser = users.users.find((candidate) => candidate.email?.toLowerCase() === DEMO.email);
  if (existingUser) {
    userId = existingUser.id;
    const { data: profile, error: profileError } = await admin.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    fail(profileError, "Falha ao consultar perfil demo");
    if (!profile) throw new Error("Usuário demo existe sem empresa vinculada; confira a conta antes de continuar.");
    tenantId = profile.tenant_id;
  } else {
    userId = randomUUID();
    const { error: userError } = await admin.auth.admin.createUser({
      id: userId,
      email: DEMO.email,
      password: "temporary-password",
      email_confirm: true,
      user_metadata: { full_name: DEMO.ownerName },
    });
    fail(userError, "Falha ao criar usuário demo");
    const { data: provisionedTenantId, error: provisionError } = await admin.rpc("provision_tenant_with_owner", {
      p_name: DEMO.tenantName,
      p_slug: DEMO.slug,
      p_host: DEMO.host,
      p_owner_id: userId,
      p_owner_name: DEMO.ownerName,
      p_owner_email: DEMO.email,
    });
    fail(provisionError, "Falha ao provisionar empresa demo");
    tenantId = provisionedTenantId;

    const modules = ["orders", "catalog", "production", "stock", "printers"];
    const { error: modulesError } = await admin.from("tenant_modules").upsert(
      modules.map((module_key) => ({ tenant_id: tenantId, module_key, enabled: true })),
      { onConflict: "tenant_id,module_key" },
    );
    fail(modulesError, "Falha ao ativar módulos demo");

    const firstNames = ["Ana", "Bruno", "Camila", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Larissa", "Marcos"];
    const lastNames = ["Almeida", "Barbosa", "Carvalho", "Dias", "Ferreira", "Gomes", "Lima", "Martins", "Nunes", "Oliveira", "Pereira", "Ribeiro"];
    const customers = [];
    for (let i = 0; i < 48; i += 1) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[(i * 5 + Math.floor(i / firstNames.length)) % lastNames.length];
      customers.push({
        tenant_id: tenantId,
        name: `${firstName} ${lastName}`,
        company_name: i % 4 === 0 ? `${lastName} Studio` : null,
        email: `cliente${String(i + 1).padStart(2, "0")}@example.test`,
        phone: `(11) 9${String(1000 + i).padStart(4, "0")}-${String(1000 + i * 7).slice(-4)}`,
      });
    }
    const savedCustomers = await insert(admin, "customers", customers);

    const materialSpecs = [
      { name: "PLA Premium", kind: "PLA", color: "Preto fosco", cost_per_kg_cents: 8900 },
      { name: "PLA Silk", kind: "PLA", color: "Dourado", cost_per_kg_cents: 11900 },
      { name: "PETG Reforçado", kind: "PETG", color: "Cinza", cost_per_kg_cents: 10400 },
      { name: "TPU Flexível", kind: "TPU", color: "Preto", cost_per_kg_cents: 15900 },
    ];
    const materials = await insert(admin, "materials", materialSpecs.map((material) => ({ tenant_id: tenantId, ...material, active: true })));

    const printerSpecs = [
      ["Bambu Lab X1 Carbon", "Bambu Lab X1C"], ["Bambu Lab P1S 01", "Bambu Lab P1S"],
      ["Bambu Lab P1S 02", "Bambu Lab P1S"], ["Creality K1 Max 01", "Creality K1 Max"],
      ["Creality K1 Max 02", "Creality K1 Max"], ["Prusa MK4 01", "Prusa MK4"],
      ["Prusa MK4 02", "Prusa MK4"], ["Ender 3 S1 Pro", "Creality Ender 3 S1 Pro"],
      ["Elegoo Neptune 4 Plus", "Elegoo Neptune 4 Plus"], ["Anycubic Kobra 2", "Anycubic Kobra 2"],
      ["Bambu Lab A1 Mini", "Bambu Lab A1 Mini"],
      ["Bambu Lab A1 01", "Bambu Lab A1"], ["Bambu Lab A1 02", "Bambu Lab A1"],
      ["Bambu Lab A1 03", "Bambu Lab A1"], ["Bambu Lab A1 04", "Bambu Lab A1"],
      ["Bambu Lab A1 05", "Bambu Lab A1"], ["Bambu Lab A1 06", "Bambu Lab A1"],
    ];
    const printers = await insert(admin, "printers", printerSpecs.map(([name, model]) => ({ tenant_id: tenantId, name, model, status: "idle", active: true })));

    const spools = [];
    for (const [materialIndex, material] of materials.entries()) {
      for (let spoolIndex = 0; spoolIndex < 6; spoolIndex += 1) {
        spools.push({
          tenant_id: tenantId,
          material_id: material.id,
          code: `BOB-${String(materialIndex + 1).padStart(2, "0")}-${String(spoolIndex + 1).padStart(2, "0")}`,
          tare_g: 1000,
          initial_gross_g: 10000,
          current_gross_g: 10000,
          status: "active",
        });
      }
    }
    const savedSpools = await insert(admin, "material_spools", spools);

    const productSpecs = [
      ["Vaso geométrico", "Decoração", 8900, 2700, 72, 150, 2],
      ["Organizador de cabos", "Organização", 2500, 600, 18, 45, 4],
      ["Suporte para celular", "Acessórios", 4500, 1200, 32, 75, 2],
      ["Luminária modular", "Decoração", 18900, 6400, 185, 360, 1],
      ["Cachepô canelado", "Decoração", 11900, 3900, 110, 220, 1],
      ["Gancho multiuso", "Organização", 1900, 500, 14, 35, 6],
      ["Suporte para headset", "Acessórios", 7900, 2300, 66, 135, 1],
      ["Miniatura articulada", "Colecionáveis", 5900, 1800, 48, 110, 2],
      ["Placa de identificação", "Personalizados", 3900, 900, 25, 55, 3],
      ["Vaso autoirrigável", "Jardinagem", 9900, 3400, 95, 190, 1],
      ["Case para controle", "Acessórios", 6900, 2100, 58, 125, 1],
      ["Peça técnica sob medida", "Peças técnicas", 14900, 5100, 145, 300, 1],
    ];
    const products = await insert(admin, "products", productSpecs.map(([name, category]) => ({ tenant_id: tenantId, name, category, description: `Produto de demonstração da linha ${category.toLowerCase()}.`, active: true })));
    const variants = await insert(admin, "product_variants", productSpecs.map((_, i) => ({
      tenant_id: tenantId,
      product_id: products[i].id,
      name: "Padrão",
      sku: `${DEMO.skuPrefix}-${String(i + 1).padStart(3, "0")}`,
      attributes: {},
      price_cents: productSpecs[i][2],
      cost_cents: productSpecs[i][3],
      active: true,
      is_default: true,
    })));

    const designs = await insert(admin, "designs", products.map((product) => ({
      tenant_id: tenantId,
      name: product.name,
      description: `Arquivo e revisão de produção para ${product.name}.`,
      category: product.category,
      active: true,
      created_by: userId,
    })));
    const revisions = await insert(admin, "design_revisions", designs.map((design) => ({ tenant_id: tenantId, design_id: design.id, version: "1.0", notes: "Revisão validada para lote de demonstração.", created_by: userId })));
    const recipes = await insert(admin, "production_recipes", variants.map((variant, i) => ({
      tenant_id: tenantId,
      product_variant_id: variant.id,
      design_revision_id: revisions[i].id,
      material_id: materials[i % materials.length].id,
      version: 1,
      estimated_g: productSpecs[i][4],
      estimated_minutes: productSpecs[i][5],
      units_per_plate: productSpecs[i][6],
      active: true,
      created_by: userId,
    })));

    const password = process.env.AGENCIA3D_LOCAL_DEMO_PASSWORD || `Agencia3dDemo-${randomBytes(6).toString("hex")}!`;
    const { error: passwordError } = await admin.auth.admin.updateUserById(userId, { password });
    fail(passwordError, "Falha ao definir senha local demo");
    const app = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: loginError } = await app.auth.signInWithPassword({ email: DEMO.email, password });
    fail(loginError, "Falha ao autenticar usuário demo");

    const productData = variants.map((variant, i) => ({
      variantId: variant.id,
      revisionId: revisions[i].id,
      materialId: materials[i % materials.length].id,
      price: productSpecs[i][2],
      recipe: recipes[i],
    }));
    const orders = [];
    const distribution = [
      ...Array(12).fill("open"),
      ...Array(18).fill("in_production"),
      ...Array(18).fill("ready"),
      ...Array(15).fill("shipped"),
      ...Array(33).fill("delivered"),
    ];
    for (let i = distribution.length - 1; i > 0; i -= 1) {
      const j = randomInt(0, i + 1);
      [distribution[i], distribution[j]] = [distribution[j], distribution[i]];
    }

    const spoolsByMaterial = new Map(materials.map((material) => [material.id, savedSpools.filter((spool) => spool.material_id === material.id)]));
    let activeProductionJobs = 0;
    for (let i = 0; i < distribution.length; i += 1) {
      const status = distribution[i];
      const customer = savedCustomers[(i * 7 + randomInt(0, savedCustomers.length)) % savedCustomers.length];
      const product = productData[randomInt(0, productData.length)];
      const quantity = randomInt(1, 8);
      const orderId = await rpc(app, "create_sales_order", {
        p_customer_id: customer.id,
        p_product_variant_id: product.variantId,
        p_quantity: quantity,
      });
      const age = status === "open" ? randomInt(0, 7) : status === "in_production" ? randomInt(0, 5) : status === "ready" ? randomInt(0, 12) : status === "shipped" ? randomInt(1, 18) : randomInt(2, 30);
      const orderDate = daysAgo(age, randomInt(8, 19));
      const order = { id: orderId, status, age, orderDate, totalPriceCents: product.price * quantity };

      if (status !== "open") {
        await rpc(app, "release_order_to_production", { p_order_id: orderId });
        const { data: op, error: opError } = await admin.from("production_orders").select("id").eq("sales_order_id", orderId).single();
        fail(opError, "Falha ao localizar ordem de produção demo");
        const recipe = product.recipe;
        const plates = Math.ceil(quantity / recipe.units_per_plate);
        const estimatedG = recipe.estimated_g * plates;
        const estimatedMinutes = recipe.estimated_minutes * plates;
        const materialSpools = spoolsByMaterial.get(product.materialId);
        const spool = materialSpools[(i + Math.floor(i / 4)) % materialSpools.length];
        const printerIndex = status === "in_production" ? activeProductionJobs % 10 : 8 + (i % 2);
        const jobId = await rpc(app, "create_production_job_once", {
          p_request_key: randomUUID(),
          p_production_order_id: op.id,
          p_printer_id: printers[printerIndex].id,
          p_spool_id: spool.id,
          p_quantity: quantity,
          p_estimated_minutes: estimatedMinutes,
          p_estimated_g: estimatedG,
        });
        order.opId = op.id;
        order.jobId = jobId;
        order.estimatedG = estimatedG;
        order.estimatedMinutes = estimatedMinutes;

        if (status === "in_production") {
          if (activeProductionJobs < 8) await rpc(app, "start_production_job", { p_job_id: jobId });
          activeProductionJobs += 1;
        } else {
          await rpc(app, "start_production_job", { p_job_id: jobId });
          await rpc(app, "complete_production_job", {
            p_job_id: jobId,
            p_actual_minutes: Math.max(1, Math.round(estimatedMinutes * (0.88 + Math.random() * 0.24))),
            p_consumed_g: Math.max(1, Math.round(estimatedG * (0.9 + Math.random() * 0.1))),
            p_good_qty: quantity,
            p_bad_qty: 0,
          });
          if (status === "shipped" || status === "delivered") {
            await rpc(app, "ship_order", { p_order_id: orderId, p_carrier: i % 3 === 0 ? "Retirada local" : "Loggi", p_tracking_code: i % 3 === 0 ? null : `BR${String(900000 + i * 137)}` });
          }
          if (status === "delivered") await rpc(app, "deliver_order", { p_order_id: orderId });
        }
      }

      const paidRatio = status === "delivered" ? (i % 5 === 0 ? 0.6 : 1) : status === "shipped" ? 0.6 : status === "ready" ? (i % 3 === 0 ? 0.5 : 0.25) : status === "in_production" ? 0.3 : i % 4 === 0 ? 0.25 : 0;
      if (paidRatio > 0) {
        const paymentId = await rpc(app, "record_order_payment", {
          p_order_id: orderId,
          p_amount_cents: Math.max(1, Math.round(order.totalPriceCents * paidRatio)),
          p_method: ["pix", "card", "bank_transfer", "cash"][i % 4],
          p_idempotency_key: randomUUID(),
        });
        order.paymentId = paymentId;
      }
      orders.push(order);
    }

    const categories = ["rent", "energy", "maintenance", "payroll", "supplies", "shipping", "other"];
    const expenseDescriptions = [
      "Aluguel do espaço fabril", "Conta de energia da operação", "Manutenção preventiva de impressoras",
      "Insumos para acabamento", "Coleta e despacho de pedidos", "Reposição de ferramentas e bicos",
      "Folha de produção", "Embalagens para expedição", "Serviço de calibração",
    ];
    const expenses = Array.from({ length: 36 }, (_, i) => ({
      tenant_id: tenantId,
      category: categories[i % categories.length],
      amount_cents: randomInt(1800, 98000),
      description: expenseDescriptions[i % expenseDescriptions.length],
      incurred_on: daysAgoDate(randomInt(0, 30)),
      idempotency_key: randomUUID(),
      created_by: userId,
    }));
    const { error: expensesError } = await admin.from("operational_expenses").insert(expenses);
    fail(expensesError, "Falha ao inserir despesas demo");

    const orderUpdates = orders.map((order) => admin.from("sales_orders").update({ created_at: order.orderDate }).eq("id", order.id));
    const updateResults = await Promise.all(orderUpdates);
    const updateFailure = updateResults.find((result) => result.error);
    fail(updateFailure?.error, "Falha ao distribuir pedidos ao longo do mês");
    for (const order of orders) {
      const timestamp = order.orderDate;
      if (order.opId) {
        fail((await admin.from("production_orders").update({ created_at: timestamp }).eq("id", order.opId)).error, "Falha ao datar OP demo");
      }
      if (order.jobId) {
        const startedAt = new Date(new Date(timestamp).getTime() + 60 * 60 * 1000).toISOString();
        const completedAt = order.status === "in_production" ? null : new Date(new Date(timestamp).getTime() + 4 * 60 * 60 * 1000).toISOString();
        fail((await admin.from("production_jobs").update({ created_at: timestamp, started_at: startedAt, ...(completedAt ? { completed_at: completedAt } : {}) }).eq("id", order.jobId)).error, "Falha ao datar job demo");
      }
      if (order.paymentId) {
        const paymentDate = new Date(new Date(timestamp).getTime() + 5 * 60 * 60 * 1000).toISOString();
        fail((await admin.from("order_payments").update({ received_at: paymentDate }).eq("id", order.paymentId)).error, "Falha ao datar recebimento demo");
      }
      if (order.status === "shipped" || order.status === "delivered") {
        const shipmentDate = new Date(new Date(timestamp).getTime() + 5 * 60 * 60 * 1000).toISOString();
        const deliveredAt = order.status === "delivered" ? new Date(new Date(timestamp).getTime() + 30 * 60 * 60 * 1000).toISOString() : null;
        fail((await admin.from("order_shipments").update({ shipped_at: shipmentDate, delivered_at: deliveredAt }).eq("order_id", order.id)).error, "Falha ao datar expedição demo");
      }
    }

    const { error: logoutError } = await app.auth.signOut();
    fail(logoutError, "Falha ao encerrar sessão de seed");
    console.log(JSON.stringify({ tenant: DEMO.tenantName, host: DEMO.host, email: DEMO.email, password, customers: customers.length, products: products.length, materials: materials.length, printers: printers.length, orders: orders.length, jobs: orders.filter((order) => order.jobId).length, expenses: expenses.length, existing: false }, null, 2));
    return;
  }

  const password = process.env.AGENCIA3D_LOCAL_DEMO_PASSWORD || `Agencia3dDemo-${randomBytes(6).toString("hex")}!`;
  const { error: passwordError } = await admin.auth.admin.updateUserById(userId, { password });
  fail(passwordError, "Falha ao atualizar senha local demo");
  const { count, error: skuError } = await admin.from("product_variants").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).like("sku", `${DEMO.skuPrefix}%`);
  fail(skuError, "Falha ao consultar catálogo demo");
  if (!count) throw new Error("Tenant demo já existe sem catálogo desta carga; verifique antes de inserir dados para evitar duplicidade.");
  const app = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: loginError } = await app.auth.signInWithPassword({ email: DEMO.email, password });
  fail(loginError, "Falha ao validar acesso local demo");
  const { count: visibleOrders, error: accessError } = await app.from("sales_orders").select("id", { count: "exact", head: true });
  fail(accessError, "Falha ao validar acesso aos pedidos demo");
  if (!visibleOrders) throw new Error("A conta demo autenticou, mas não enxerga pedidos no tenant.");
  fail((await app.auth.signOut()).error, "Falha ao encerrar validação de acesso");
  console.log(JSON.stringify({ tenant: DEMO.tenantName, host: DEMO.host, email: DEMO.email, password, products: count, existing: true }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
