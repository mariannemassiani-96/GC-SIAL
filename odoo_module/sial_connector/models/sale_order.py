import json
import logging
from urllib.request import urlopen, Request
from urllib.error import URLError

from odoo import models, fields, api
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

SIAL_API_URL = "https://pro.groupe-vista.fr/api-sial"


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    sial_sent = fields.Boolean("Envoye a SIAL", default=False, copy=False)
    sial_sent_date = fields.Datetime("Date envoi SIAL", copy=False)

    def action_send_to_sial(self):
        api_key = self.env['ir.config_parameter'].sudo().get_param(
            'sial_connector.api_key', default=''
        )

        for order in self:
            lignes = []
            for line in order.order_line:
                if line.display_type:
                    continue
                lignes.append({
                    'product': line.product_id.name or '',
                    'reference': line.product_id.default_code or '',
                    'description': line.name or '',
                    'qty': line.product_uom_qty,
                    'uom': line.product_uom.name if line.product_uom else '',
                })

            payload = {
                'ref': order.name,
                'client': order.partner_id.name or '',
                'chantier': order.partner_shipping_id.name or order.partner_id.name or '',
                'semaine_fab': '',
                'semaine_liv': order.commitment_date.strftime('S%W') if order.commitment_date else '',
                'lignes': lignes,
                'notes': order.note or '',
            }

            data = json.dumps(payload).encode('utf-8')
            headers = {
                'Content-Type': 'application/json',
            }
            if api_key:
                headers['X-Api-Key'] = api_key

            req = Request(
                f"{SIAL_API_URL}/api/commandes-globales/from-odoo",
                data=data,
                headers=headers,
                method='POST',
            )

            try:
                with urlopen(req, timeout=15) as resp:
                    result = json.loads(resp.read().decode('utf-8'))
                    _logger.info("SIAL: commande %s -> %s", order.name, result.get('action'))
            except URLError as e:
                raise UserError(f"Erreur connexion SIAL : {e.reason}") from e
            except Exception as e:
                raise UserError(f"Erreur envoi SIAL : {e}") from e

            order.write({
                'sial_sent': True,
                'sial_sent_date': fields.Datetime.now(),
            })

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'SIAL Atelier',
                'message': f'{len(self)} commande(s) envoyee(s) a SIAL',
                'type': 'success',
                'sticky': False,
            },
        }
