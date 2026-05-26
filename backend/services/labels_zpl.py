"""
ZPL label generation for industrial glass production (Isula Vitrage).

Generates Zebra Programming Language output for four label types:
  - CE/CEKAL conformity label (100x70 mm)
  - Atelier/workshop routing label (150x100 mm)
  - Post-coupe piece identification label (70x50 mm)
  - WE (warm-edge) spacer label (80x30 mm)
"""

from schemas import VitrageLabel, PieceFace


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def mm_to_dots(mm: float, dpi: int = 203) -> int:
    """Convert millimetres to printer dots at the given DPI."""
    return int(mm * dpi / 25.4)


def _pw(mm: float, dpi: int) -> int:
    """Print-width in dots for a label width in mm."""
    return mm_to_dots(mm, dpi)


def _ll(mm: float, dpi: int) -> int:
    """Label-length in dots for a label height in mm."""
    return mm_to_dots(mm, dpi)


def _qr_payload(label: VitrageLabel) -> str:
    """Build the QR-code content string for a vitrage label."""
    return f"VI-{label.commande_ref}-{label.reference}|{label.width:.0f}x{label.height:.0f}"


# ---------------------------------------------------------------------------
# CE / CEKAL label  — 100 x 70 mm
# ---------------------------------------------------------------------------

def generate_ce_label(label: VitrageLabel, dpi: int = 203) -> str:
    """Return a ZPL block for a CE/CEKAL conformity label (100x70 mm)."""

    pw = _pw(100, dpi)
    ll = _ll(70, dpi)

    qr_data = _qr_payload(label)
    ug_line = f"Ug = {label.ug} W/m²K — {label.gaz}" if label.ug else ""

    zpl = (
        f"^XA\n"
        f"^CI28\n"
        f"^PW{pw}\n"
        f"^LL{ll}\n"
        # CE + standard
        f"^FO30,20^A0N,48,48^FDCE^FS\n"
        f"^FO130,30^A0N,28,28^FDEN 1279-5^FS\n"
        # Product type
        f"^FO30,75^A0N,24,24^FDVITRAGE ISOLANT^FS\n"
        # Composition
        f"^FO30,110^A0N,28,28^FD{label.composition}^FS\n"
        # Dimensions
        f"^FO30,150^A0N,28,28^FD{label.width:.0f} x {label.height:.0f} mm^FS\n"
        # Ug + gaz
        f"^FO30,190^A0N,24,24^FD{ug_line}^FS\n"
        # Manufacturer
        f"^FO30,230^A0N,22,22^FDISULA VITRAGE — Biguglia^FS\n"
        # CEKAL + regional tag
        f"^FO30,265^A0N,26,26^FDCEKAL^FS\n"
        f"^FO200,270^A0N,18,18^FDFATTU IN CORSICA^FS\n"
        # QR code (right side)
        f"^FO{pw - 200},20^BQN,2,5^FDMA,{qr_data}^FS\n"
        # Code128 barcode (bottom)
        f"^FO30,{ll - 140}^BCN,80,Y,N,N^FD{label.vitrage_id}^FS\n"
        f"^XZ\n"
    )
    return zpl


# ---------------------------------------------------------------------------
# Atelier / workshop label  — 150 x 100 mm
# ---------------------------------------------------------------------------

_CHECKLIST_LINES = [
    "Coupe verre",
    "Lavage",
    "Assemblage cadre",
    "Remplissage gaz",
    "Fermeture vitrage",
    "Controle qualite",
]


def generate_atelier_label(label: VitrageLabel, dpi: int = 203) -> str:
    """Return a ZPL block for an atelier/workshop label (150x100 mm)."""

    pw = _pw(150, dpi)
    ll = _ll(100, dpi)

    qr_data = _qr_payload(label)
    ug_line = f"Ug = {label.ug} W/m²K — {label.gaz}" if label.ug else ""

    lines: list[str] = [
        f"^XA",
        f"^CI28",
        f"^PW{pw}",
        f"^LL{ll}",
        # Header
        f"^FO30,20^A0N,30,30^FDISULA VITRAGE — FICHE ATELIER^FS",
        # Client + commande
        f"^FO30,60^A0N,24,24^FDClient: {label.client}^FS",
        f"^FO30,90^A0N,24,24^FDCommande: {label.commande_ref}^FS",
        # Reference (big)
        f"^FO30,125^A0N,44,44^FD{label.reference}^FS",
        # Composition + dimensions + Ug
        f"^FO30,180^A0N,22,22^FD{label.composition}  {label.width:.0f}x{label.height:.0f} mm^FS",
        f"^FO30,210^A0N,22,22^FD{ug_line}^FS",
    ]

    # Checklist — 6 rows, each with a checkbox square + text + underscores
    y_start = 250
    row_h = 38
    box_size = 22

    for i, task in enumerate(_CHECKLIST_LINES):
        y = y_start + i * row_h
        # Checkbox square (drawn as a graphic box)
        lines.append(f"^FO30,{y}^GB{box_size},{box_size},2^FS")
        # Task text + signature blanks
        lines.append(f"^FO60,{y}^A0N,20,20^FD{task} _____ _____^FS")

    # QR code (bottom-right)
    lines.append(f"^FO{pw - 200},{ll - 200}^BQN,2,5^FDMA,{qr_data}^FS")

    lines.append(f"^XZ")

    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Post-coupe label  — 70 x 50 mm
# ---------------------------------------------------------------------------

def generate_postcoupe_label(label: VitrageLabel, dpi: int = 203) -> str:
    """Return a ZPL block for a post-coupe piece label (70x50 mm)."""

    pw = _pw(70, dpi)
    ll = _ll(50, dpi)

    face_tag = f"[{label.face.value}]" if label.face else ""
    qr_data = _qr_payload(label)

    zpl = (
        f"^XA\n"
        f"^CI28\n"
        f"^PW{pw}\n"
        f"^LL{ll}\n"
        # Reference + face
        f"^FO20,15^A0N,32,32^FD{label.reference} {face_tag}^FS\n"
        # Material (composition serves as the material descriptor here)
        f"^FO20,55^A0N,22,22^FD{label.composition}^FS\n"
        # Dimensions
        f"^FO20,85^A0N,24,24^FD{label.width:.0f} x {label.height:.0f} mm^FS\n"
        # QR code (right side)
        f"^FO{pw - 150},15^BQN,2,4^FDMA,{qr_data}^FS\n"
        f"^XZ\n"
    )
    return zpl


# ---------------------------------------------------------------------------
# WE (warm-edge) spacer label  — 80 x 30 mm
# ---------------------------------------------------------------------------

def generate_we_label(
    thickness: int,
    color: str,
    length: float,
    cote: str,
    vitrage_ref: str,
    commande_ref: str,
    dpi: int = 203,
) -> str:
    """Return a ZPL block for a warm-edge spacer label (80x30 mm).

    Parameters
    ----------
    thickness : int
        Spacer thickness in mm (e.g. 10, 12, 16).
    color : str
        Spacer colour (e.g. "NOIR", "GRIS").
    length : float
        Total spacer length in mm.
    cote : str
        Side indicator — "C" (court) or "L" (long).
    vitrage_ref : str
        Parent vitrage reference.
    commande_ref : str
        Order reference.
    """

    pw = _pw(80, dpi)
    ll = _ll(30, dpi)

    zpl = (
        f"^XA\n"
        f"^CI28\n"
        f"^PW{pw}\n"
        f"^LL{ll}\n"
        f"^FO15,8^A0N,26,26^FDWE {thickness} {color}^FS\n"
        f"^FO15,40^A0N,22,22^FD{length:.0f} mm  {cote}^FS\n"
        f"^FO15,70^A0N,18,18^FD{vitrage_ref} / {commande_ref}^FS\n"
        f"^XZ\n"
    )
    return zpl


# ---------------------------------------------------------------------------
# Batch generation
# ---------------------------------------------------------------------------

def generate_zpl_batch(
    labels: list[VitrageLabel],
    label_type: str = "ce",
    dpi: int = 203,
) -> str:
    """Generate concatenated ZPL for a list of labels.

    Each label produces an independent ``^XA … ^XZ`` block so the printer
    treats them as separate labels.

    Parameters
    ----------
    labels : list[VitrageLabel]
        Label data items.
    label_type : str
        One of ``"ce"``, ``"atelier"``, ``"postcoupe"``.
    dpi : int
        Printer resolution (default 203 dpi).

    Returns
    -------
    str
        Concatenated ZPL string ready to send to the printer.

    Raises
    ------
    ValueError
        If *label_type* is not recognised.
    """

    generators = {
        "ce": generate_ce_label,
        "atelier": generate_atelier_label,
        "postcoupe": generate_postcoupe_label,
    }

    gen = generators.get(label_type)
    if gen is None:
        raise ValueError(
            f"Unknown label_type '{label_type}'. "
            f"Expected one of: {', '.join(generators)}"
        )

    return "".join(gen(lbl, dpi=dpi) for lbl in labels)
