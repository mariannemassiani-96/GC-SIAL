import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://isula:isula2026@localhost:5432/isula_vitrage")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

PLATE_SIZES = [
    (3210, 2550),
    (4500, 3210),
]
DEFAULT_EDGE_MARGIN = 15
DEFAULT_CUTTING_GAP = 0
MIN_STRIP_WIDTH = 20
MIN_REMNANT_SIZE = 300
FORBIDDEN_REMNANT_MIN = 50
FORBIDDEN_REMNANT_MAX = 250

# Odoo 18 JSON-RPC
ODOO_URL = os.getenv("ODOO_URL", "https://odoo.sial-apertura.fr")
ODOO_DB = os.getenv("ODOO_DB", "sial")
ODOO_USER = os.getenv("ODOO_USER", "")
ODOO_PASSWORD = os.getenv("ODOO_PASSWORD", "")
