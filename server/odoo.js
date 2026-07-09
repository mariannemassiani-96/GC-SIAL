/**
 * Odoo 18 JSON-RPC connector for Node.js (sial-api).
 *
 * Uses Odoo's /jsonrpc endpoint for:
 *  - Authentication
 *  - Products (product.product)
 *  - Stock (stock.quant, stock.location)
 *  - Partners/Suppliers (res.partner)
 *  - Purchase orders (purchase.order)
 *  - Invoices (account.move)
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const ODOO_URL = process.env.ODOO_URL || '';
const ODOO_DB = process.env.ODOO_DB || 'sial';
const ODOO_USER = process.env.ODOO_USER || '';
const ODOO_PASSWORD = process.env.ODOO_PASSWORD || '';

let _uid = null;
let _reqId = 0;

function jsonrpc(url, method, params) {
  _reqId++;
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method,
    params,
    id: _reqId,
  });

  const parsed = new URL(url);
  const mod = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = mod.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              const msg =
                json.error.data?.message || json.error.message || JSON.stringify(json.error);
              reject(new Error(`Odoo: ${msg}`));
            } else {
              resolve(json.result);
            }
          } catch (e) {
            reject(new Error(`Odoo JSON parse: ${e.message}`));
          }
        });
      },
    );
    req.on('error', (e) => reject(new Error(`Odoo connexion: ${e.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('Odoo timeout')); });
    req.write(payload);
    req.end();
  });
}

function call(service, method, ...args) {
  return jsonrpc(`${ODOO_URL}/jsonrpc`, 'call', {
    service,
    method,
    args,
  });
}

async function authenticate() {
  if (!ODOO_URL || !ODOO_USER || !ODOO_PASSWORD) {
    throw new Error('Config Odoo manquante (ODOO_URL, ODOO_USER, ODOO_PASSWORD)');
  }
  _uid = await call('common', 'login', ODOO_DB, ODOO_USER, ODOO_PASSWORD);
  if (!_uid) throw new Error('Authentification Odoo echouee');
  return _uid;
}

async function ensureAuth() {
  if (!_uid) await authenticate();
  return _uid;
}

async function execute(model, method, ...args) {
  const uid = await ensureAuth();
  const kw = typeof args[args.length - 1] === 'object' && !Array.isArray(args[args.length - 1])
    ? args.pop()
    : {};
  return call('object', 'execute_kw', ODOO_DB, uid, ODOO_PASSWORD, model, method, args, kw);
}

// ── Public API ──────────────────────────────────────────────────────

async function testConnection() {
  const version = await jsonrpc(`${ODOO_URL}/jsonrpc`, 'call', {
    service: 'common',
    method: 'version',
    args: [],
  });
  const uid = await authenticate();
  return {
    status: 'ok',
    odoo_version: version?.server_version || 'unknown',
    uid,
    url: ODOO_URL,
    db: ODOO_DB,
  };
}

async function searchProducts(domain = [], fields = null, limit = 100, offset = 0) {
  return execute(
    'product.product',
    'search_read',
    domain,
    {
      fields: fields || ['id', 'name', 'default_code', 'list_price', 'standard_price', 'qty_available', 'categ_id', 'barcode', 'type'],
      limit,
      offset,
    },
  );
}

async function getProduct(id) {
  const res = await execute('product.product', 'search_read', [['id', '=', id]], {
    fields: ['id', 'name', 'default_code', 'list_price', 'standard_price', 'qty_available', 'categ_id', 'barcode', 'type', 'uom_id'],
  });
  if (!res.length) throw new Error(`Produit ${id} introuvable`);
  return res[0];
}

async function createProduct(vals) {
  return execute('product.product', 'create', [vals]);
}

async function getStockQuants(domain = null, limit = 500) {
  return execute('stock.quant', 'search_read', domain || [['location_id.usage', '=', 'internal']], {
    fields: ['id', 'product_id', 'location_id', 'quantity', 'reserved_quantity', 'lot_id'],
    limit,
  });
}

async function getStockLocations(domain = null) {
  return execute('stock.location', 'search_read', domain || [['usage', '=', 'internal']], {
    fields: ['id', 'name', 'complete_name', 'barcode'],
  });
}

async function adjustStock(productId, locationId, newQty) {
  const quants = await execute('stock.quant', 'search_read',
    [['product_id', '=', productId], ['location_id', '=', locationId]],
    { fields: ['id', 'quantity'], limit: 1 },
  );
  if (quants.length) {
    return execute('stock.quant', 'write', [quants[0].id], { inventory_quantity: newQty });
  }
  return execute('stock.quant', 'create', [{ product_id: productId, location_id: locationId, inventory_quantity: newQty }]);
}

async function searchPartners(domain = null, limit = 100) {
  return execute('res.partner', 'search_read', domain || [['supplier_rank', '>', 0]], {
    fields: ['id', 'name', 'ref', 'email', 'phone', 'supplier_rank', 'customer_rank'],
    limit,
  });
}

async function searchPurchaseOrders(domain = [], limit = 50) {
  return execute('purchase.order', 'search_read', domain, {
    fields: ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state', 'order_line'],
    limit,
  });
}

async function getPurchaseOrder(id) {
  const res = await execute('purchase.order', 'search_read', [['id', '=', id]], {
    fields: ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state', 'order_line', 'date_planned', 'notes'],
  });
  if (!res.length) throw new Error(`Commande ${id} introuvable`);
  const po = res[0];
  if (po.order_line?.length) {
    po.lines = await execute('purchase.order.line', 'search_read', [['id', 'in', po.order_line]], {
      fields: ['id', 'product_id', 'name', 'product_qty', 'price_unit', 'price_subtotal', 'date_planned'],
    });
  }
  return po;
}

async function createPurchaseOrder(partnerId, lines) {
  const orderLines = lines.map((l) => [0, 0, {
    product_id: l.product_id,
    product_qty: l.qty || 1,
    price_unit: l.price || 0,
    name: l.name || '',
  }]);
  return execute('purchase.order', 'create', [{ partner_id: partnerId, order_line: orderLines }]);
}

async function searchInvoices(domain = [], limit = 50) {
  return execute('account.move', 'search_read',
    domain.length ? domain : [['move_type', 'in', ['in_invoice', 'out_invoice']]],
    {
      fields: ['id', 'name', 'partner_id', 'invoice_date', 'amount_total', 'state', 'move_type', 'payment_state'],
      limit,
    },
  );
}

module.exports = {
  testConnection,
  searchProducts,
  getProduct,
  createProduct,
  getStockQuants,
  getStockLocations,
  adjustStock,
  searchPartners,
  searchPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  searchInvoices,
};
