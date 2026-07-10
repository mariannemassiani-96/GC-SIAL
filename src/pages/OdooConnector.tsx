import { useState, useEffect } from 'react';
import {
  testOdooConnection,
  searchProducts,
  getStockQuants,
  getSuppliers,
  getPurchaseOrders,
  getInvoices,
  type OdooStatus,
  type OdooProduct,
  type OdooStockQuant,
  type OdooPartner,
  type OdooPurchaseOrder,
  type OdooInvoice,
} from '../odoo/api';

type Tab = 'status' | 'products' | 'stock' | 'suppliers' | 'purchases' | 'invoices';

export function OdooConnector({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('status');
  const [status, setStatus] = useState<OdooStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testConn = async () => {
    setLoading(true);
    setError('');
    try {
      const s = await testOdooConnection();
      setStatus(s);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  useEffect(() => { testConn(); }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'status', label: 'Connexion' },
    { id: 'products', label: 'Produits' },
    { id: 'stock', label: 'Stock' },
    { id: 'suppliers', label: 'Fournisseurs' },
    { id: 'purchases', label: 'Achats' },
    { id: 'invoices', label: 'Factures' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition-colors">Accueil</button>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-bold text-orange-400">Odoo 18</span>
          </div>
          <div className="flex items-center gap-2">
            {status?.status === 'ok' && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-green-600/20 text-green-400 border border-green-500/30">
                Connecte — {status.odoo_version}
              </span>
            )}
            {status?.status === 'error' && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                Deconnecte
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-1 mb-6 border-b border-[#2a2d35]">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 ${
                tab === t.id ? 'border-orange-500 text-orange-400 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {tab === 'status' && <StatusTab status={status} loading={loading} onTest={testConn} />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'stock' && <StockTab />}
        {tab === 'suppliers' && <SuppliersTab />}
        {tab === 'purchases' && <PurchasesTab />}
        {tab === 'invoices' && <InvoicesTab />}
      </div>
    </div>
  );
}

function StatusTab({ status, loading, onTest }: { status: OdooStatus | null; loading: boolean; onTest: () => void }) {
  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-[#181a20] rounded-lg p-5 border border-[#2a2d35]">
        <h3 className="text-sm font-bold text-amber-400 mb-4">Connexion Odoo 18</h3>
        {status?.status === 'ok' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-white font-semibold">Connecte</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-gray-400">Version</div>
              <div className="text-white">{status.odoo_version}</div>
              <div className="text-gray-400">URL</div>
              <div className="text-white text-xs break-all">{status.url}</div>
              <div className="text-gray-400">Base</div>
              <div className="text-white">{status.db}</div>
              <div className="text-gray-400">UID</div>
              <div className="text-white">{status.uid}</div>
            </div>
          </div>
        ) : status?.status === 'error' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-red-400 font-semibold">Erreur de connexion</span>
            </div>
            <p className="text-sm text-red-400/80">{status.error}</p>
            <p className="text-xs text-gray-500">
              Verifiez que les variables ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD sont configurees sur le serveur.
            </p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">{loading ? 'Test en cours...' : 'Cliquez sur Tester pour verifier la connexion.'}</p>
        )}
        <button onClick={onTest} disabled={loading}
          className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
          {loading ? 'Test...' : 'Tester la connexion'}
        </button>
      </div>

      <div className="bg-[#181a20] rounded-lg p-5 border border-[#2a2d35]">
        <h3 className="text-sm font-bold text-amber-400 mb-2">Configuration</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Variables d'environnement a configurer sur le serveur FastAPI :
        </p>
        <pre className="mt-2 text-xs text-gray-400 bg-[#14161d] rounded p-3 overflow-x-auto">{`ODOO_URL=https://odoo.sial-apertura.fr
ODOO_DB=sial
ODOO_USER=api@sial-apertura.fr
ODOO_PASSWORD=votre_mot_de_passe`}</pre>
      </div>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<OdooProduct[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (q = '') => {
    setLoading(true);
    try { setProducts(await searchProducts(q)); } catch { setProducts([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(search)}
          placeholder="Rechercher un produit..."
          className="flex-1 px-3 py-2 bg-[#181a20] border border-[#2a2d35] rounded text-white text-sm" />
        <button onClick={() => load(search)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded transition-colors">
          Chercher
        </button>
      </div>
      {loading ? (
        <p className="text-gray-500 text-sm">Chargement...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
              <th className="text-left py-2 px-2">Ref</th>
              <th className="text-left py-2 px-2">Nom</th>
              <th className="text-left py-2 px-2">Categorie</th>
              <th className="text-right py-2 px-2">Prix achat</th>
              <th className="text-right py-2 px-2">Prix vente</th>
              <th className="text-right py-2 px-2">Qte dispo</th>
              <th className="text-left py-2 px-2">Code-barre</th>
            </tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-[#1e2028] hover:bg-[#1a1c24]">
                  <td className="py-1.5 px-2 text-amber-400 font-mono">{p.default_code || '—'}</td>
                  <td className="py-1.5 px-2 text-white">{p.name}</td>
                  <td className="py-1.5 px-2 text-gray-400">{Array.isArray(p.categ_id) ? p.categ_id[1] : ''}</td>
                  <td className="py-1.5 px-2 text-white text-right">{p.standard_price.toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-white text-right">{p.list_price.toFixed(2)}</td>
                  <td className={`py-1.5 px-2 text-right font-bold ${p.qty_available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.qty_available}
                  </td>
                  <td className="py-1.5 px-2 text-gray-500 font-mono text-[10px]">{p.barcode || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Aucun produit trouve.</p>}
        </div>
      )}
    </div>
  );
}

function StockTab() {
  const [quants, setQuants] = useState<OdooStockQuant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setQuants(await getStockQuants()); } catch { setQuants([]); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-gray-500 text-sm">Chargement stock...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
          <th className="text-left py-2 px-2">Produit</th>
          <th className="text-left py-2 px-2">Emplacement</th>
          <th className="text-right py-2 px-2">Quantite</th>
          <th className="text-right py-2 px-2">Reserve</th>
          <th className="text-left py-2 px-2">Lot</th>
        </tr></thead>
        <tbody>
          {quants.map(q => (
            <tr key={q.id} className="border-b border-[#1e2028]">
              <td className="py-1.5 px-2 text-white">{Array.isArray(q.product_id) ? q.product_id[1] : ''}</td>
              <td className="py-1.5 px-2 text-gray-400">{Array.isArray(q.location_id) ? q.location_id[1] : ''}</td>
              <td className={`py-1.5 px-2 text-right font-bold ${q.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {q.quantity}
              </td>
              <td className="py-1.5 px-2 text-right text-amber-400">{q.reserved_quantity}</td>
              <td className="py-1.5 px-2 text-gray-500">{Array.isArray(q.lot_id) ? q.lot_id[1] : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {quants.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Aucun stock.</p>}
    </div>
  );
}

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<OdooPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setSuppliers(await getSuppliers()); } catch { setSuppliers([]); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-gray-500 text-sm">Chargement fournisseurs...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
          <th className="text-left py-2 px-2">Nom</th>
          <th className="text-left py-2 px-2">Reference</th>
          <th className="text-left py-2 px-2">Email</th>
          <th className="text-left py-2 px-2">Telephone</th>
        </tr></thead>
        <tbody>
          {suppliers.map(s => (
            <tr key={s.id} className="border-b border-[#1e2028]">
              <td className="py-1.5 px-2 text-white font-medium">{s.name}</td>
              <td className="py-1.5 px-2 text-gray-400 font-mono">{s.ref || '—'}</td>
              <td className="py-1.5 px-2 text-blue-400">{s.email || '—'}</td>
              <td className="py-1.5 px-2 text-gray-300">{s.phone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {suppliers.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Aucun fournisseur.</p>}
    </div>
  );
}

function PurchasesTab() {
  const [orders, setOrders] = useState<OdooPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setOrders(await getPurchaseOrders()); } catch { setOrders([]); }
      setLoading(false);
    })();
  }, []);

  const stateLabel: Record<string, string> = {
    draft: 'Brouillon', sent: 'Envoye', purchase: 'Commande', done: 'Termine', cancel: 'Annule',
  };

  const stateColor: Record<string, string> = {
    draft: 'text-gray-400', sent: 'text-blue-400', purchase: 'text-green-400', done: 'text-green-300', cancel: 'text-red-400',
  };

  if (loading) return <p className="text-gray-500 text-sm">Chargement achats...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
          <th className="text-left py-2 px-2">N</th>
          <th className="text-left py-2 px-2">Fournisseur</th>
          <th className="text-left py-2 px-2">Date</th>
          <th className="text-right py-2 px-2">Montant</th>
          <th className="text-left py-2 px-2">Statut</th>
        </tr></thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="border-b border-[#1e2028]">
              <td className="py-1.5 px-2 text-amber-400 font-mono">{o.name}</td>
              <td className="py-1.5 px-2 text-white">{Array.isArray(o.partner_id) ? o.partner_id[1] : ''}</td>
              <td className="py-1.5 px-2 text-gray-400">{o.date_order?.slice(0, 10) || ''}</td>
              <td className="py-1.5 px-2 text-white text-right font-bold">{o.amount_total.toFixed(2)} EUR</td>
              <td className={`py-1.5 px-2 font-semibold ${stateColor[o.state] || 'text-gray-400'}`}>
                {stateLabel[o.state] || o.state}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Aucune commande d'achat.</p>}
    </div>
  );
}

function InvoicesTab() {
  const [invoices, setInvoices] = useState<OdooInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setInvoices(await getInvoices()); } catch { setInvoices([]); }
      setLoading(false);
    })();
  }, []);

  const stateLabel: Record<string, string> = {
    draft: 'Brouillon', posted: 'Validee', cancel: 'Annulee',
  };

  if (loading) return <p className="text-gray-500 text-sm">Chargement factures...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
          <th className="text-left py-2 px-2">N</th>
          <th className="text-left py-2 px-2">Type</th>
          <th className="text-left py-2 px-2">Partenaire</th>
          <th className="text-left py-2 px-2">Date</th>
          <th className="text-right py-2 px-2">Montant</th>
          <th className="text-left py-2 px-2">Statut</th>
          <th className="text-left py-2 px-2">Paiement</th>
        </tr></thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id} className="border-b border-[#1e2028]">
              <td className="py-1.5 px-2 text-amber-400 font-mono">{inv.name}</td>
              <td className="py-1.5 px-2 text-gray-400">{inv.move_type === 'in_invoice' ? 'Achat' : 'Vente'}</td>
              <td className="py-1.5 px-2 text-white">{Array.isArray(inv.partner_id) ? inv.partner_id[1] : ''}</td>
              <td className="py-1.5 px-2 text-gray-400">{inv.invoice_date || ''}</td>
              <td className="py-1.5 px-2 text-white text-right font-bold">{inv.amount_total.toFixed(2)} EUR</td>
              <td className="py-1.5 px-2 text-gray-300">{stateLabel[inv.state] || inv.state}</td>
              <td className={`py-1.5 px-2 font-semibold ${inv.payment_state === 'paid' ? 'text-green-400' : 'text-amber-400'}`}>
                {inv.payment_state === 'paid' ? 'Paye' : inv.payment_state === 'not_paid' ? 'Non paye' : inv.payment_state}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {invoices.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Aucune facture.</p>}
    </div>
  );
}
