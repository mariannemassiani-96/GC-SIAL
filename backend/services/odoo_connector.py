"""Odoo 18 JSON-RPC connector for SIAL.

Provides a thin wrapper around Odoo's JSON-RPC API for:
  - Product catalog sync (product.product / product.template)
  - Stock levels (stock.quant)
  - Stock locations (stock.location)
  - Purchase orders (purchase.order)
  - Invoices (account.move)
  - Partners/suppliers (res.partner)
"""

from __future__ import annotations

import json
import logging
from typing import Any
from urllib.request import Request, urlopen
from urllib.error import URLError

from config import ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD

logger = logging.getLogger(__name__)

_uid: int | None = None
_req_id = 0


class OdooError(Exception):
    pass


def _jsonrpc(url: str, method: str, params: dict) -> Any:
    global _req_id
    _req_id += 1
    payload = json.dumps({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": _req_id,
    }).encode("utf-8")

    req = Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except URLError as e:
        raise OdooError(f"Connexion Odoo impossible: {e}") from e

    if "error" in data:
        err = data["error"]
        msg = err.get("data", {}).get("message", err.get("message", str(err)))
        raise OdooError(f"Odoo: {msg}")
    return data.get("result")


def _call(service: str, method: str, *args: Any) -> Any:
    return _jsonrpc(
        f"{ODOO_URL}/jsonrpc",
        "call",
        {"service": service, "method": method, "args": list(args)},
    )


def authenticate() -> int:
    global _uid
    if not ODOO_URL or not ODOO_USER or not ODOO_PASSWORD:
        raise OdooError("Configuration Odoo manquante (ODOO_URL, ODOO_USER, ODOO_PASSWORD)")
    _uid = _call("common", "login", ODOO_DB, ODOO_USER, ODOO_PASSWORD)
    if not _uid:
        raise OdooError("Authentification Odoo echouee — verifiez identifiants")
    return _uid


def _ensure_auth() -> int:
    global _uid
    if _uid is None:
        authenticate()
    assert _uid is not None
    return _uid


def execute(model: str, method: str, *args: Any, **kwargs: Any) -> Any:
    uid = _ensure_auth()
    return _call(
        "object", "execute_kw",
        ODOO_DB, uid, ODOO_PASSWORD,
        model, method, list(args), kwargs,
    )


# ── Products ──────────────────────────────────────────────────────────


def search_products(
    domain: list | None = None,
    fields: list[str] | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    return execute(
        "product.product", "search_read",
        domain or [],
        fields=fields or ["id", "name", "default_code", "list_price",
                          "standard_price", "qty_available", "categ_id",
                          "barcode", "type"],
        limit=limit, offset=offset,
    )


def get_product(product_id: int) -> dict:
    results = execute(
        "product.product", "search_read",
        [["id", "=", product_id]],
        fields=["id", "name", "default_code", "list_price",
                "standard_price", "qty_available", "categ_id",
                "barcode", "type", "uom_id"],
    )
    if not results:
        raise OdooError(f"Produit {product_id} introuvable")
    return results[0]


def create_product(vals: dict) -> int:
    return execute("product.product", "create", [vals])


def update_product(product_id: int, vals: dict) -> bool:
    return execute("product.product", "write", [product_id], vals)


# ── Stock ─────────────────────────────────────────────────────────────


def get_stock_quants(
    domain: list | None = None,
    fields: list[str] | None = None,
    limit: int = 500,
) -> list[dict]:
    return execute(
        "stock.quant", "search_read",
        domain or [["location_id.usage", "=", "internal"]],
        fields=fields or ["id", "product_id", "location_id",
                          "quantity", "reserved_quantity", "lot_id"],
        limit=limit,
    )


def get_stock_locations(
    domain: list | None = None,
) -> list[dict]:
    return execute(
        "stock.location", "search_read",
        domain or [["usage", "=", "internal"]],
        fields=["id", "name", "complete_name", "barcode"],
    )


def adjust_stock(product_id: int, location_id: int, new_qty: float) -> Any:
    quants = execute(
        "stock.quant", "search_read",
        [["product_id", "=", product_id], ["location_id", "=", location_id]],
        fields=["id", "quantity"],
        limit=1,
    )
    if quants:
        return execute("stock.quant", "write", [quants[0]["id"]],
                       {"inventory_quantity": new_qty})
    return execute("stock.quant", "create", [{
        "product_id": product_id,
        "location_id": location_id,
        "inventory_quantity": new_qty,
    }])


# ── Partners / Suppliers ──────────────────────────────────────────────


def search_partners(
    domain: list | None = None,
    limit: int = 100,
) -> list[dict]:
    return execute(
        "res.partner", "search_read",
        domain or [["supplier_rank", ">", 0]],
        fields=["id", "name", "ref", "email", "phone",
                "supplier_rank", "customer_rank"],
        limit=limit,
    )


# ── Purchase Orders ──────────────────────────────────────────────────


def search_purchase_orders(
    domain: list | None = None,
    limit: int = 50,
) -> list[dict]:
    return execute(
        "purchase.order", "search_read",
        domain or [],
        fields=["id", "name", "partner_id", "date_order",
                "amount_total", "state", "order_line"],
        limit=limit,
    )


def get_purchase_order(po_id: int) -> dict:
    results = execute(
        "purchase.order", "search_read",
        [["id", "=", po_id]],
        fields=["id", "name", "partner_id", "date_order",
                "amount_total", "state", "order_line",
                "date_planned", "notes"],
    )
    if not results:
        raise OdooError(f"Commande achat {po_id} introuvable")
    po = results[0]
    if po.get("order_line"):
        po["lines"] = execute(
            "purchase.order.line", "search_read",
            [["id", "in", po["order_line"]]],
            fields=["id", "product_id", "name", "product_qty",
                    "price_unit", "price_subtotal", "date_planned"],
        )
    return po


def create_purchase_order(partner_id: int, lines: list[dict]) -> int:
    order_lines = []
    for line in lines:
        order_lines.append((0, 0, {
            "product_id": line["product_id"],
            "product_qty": line.get("qty", 1),
            "price_unit": line.get("price", 0),
            "name": line.get("name", ""),
        }))
    return execute("purchase.order", "create", [{
        "partner_id": partner_id,
        "order_line": order_lines,
    }])


# ── Invoices ─────────────────────────────────────────────────────────


def search_invoices(
    domain: list | None = None,
    limit: int = 50,
) -> list[dict]:
    return execute(
        "account.move", "search_read",
        domain or [["move_type", "in", ["in_invoice", "out_invoice"]]],
        fields=["id", "name", "partner_id", "invoice_date",
                "amount_total", "state", "move_type",
                "payment_state"],
        limit=limit,
    )


# ── Health / Test ────────────────────────────────────────────────────


def test_connection() -> dict:
    version = _jsonrpc(
        f"{ODOO_URL}/jsonrpc",
        "call",
        {"service": "common", "method": "version", "args": []},
    )
    uid = authenticate()
    return {
        "status": "ok",
        "odoo_version": version.get("server_version", "unknown"),
        "uid": uid,
        "url": ODOO_URL,
        "db": ODOO_DB,
    }
