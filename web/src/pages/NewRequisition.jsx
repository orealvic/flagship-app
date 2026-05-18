import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function NewRequisition() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [title, setTitle] = useState("");
  const [requester, setRequester] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listVendors().then(d => setVendors(d.vendors)).catch(e => setError(e.message));
  }, []);

  const updateItem = (i, field, value) => {
    const copy = [...items];
    copy[i] = { ...copy[i], [field]: value };
    setItems(copy);
  };

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const total = items.reduce((s, li) => s + Number(li.quantity || 0) * Number(li.unit_price || 0), 0);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.createRequisition({ title, requester, vendor_id: parseInt(vendorId, 10), line_items: items });
      navigate("/");
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">New Requisition</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {error && <div className="bg-red-100 border border-red-300 text-red-800 px-3 py-2 rounded">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Requester (email)</label>
          <input type="email" value={requester} onChange={e => setRequester(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
          <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2">
            <option value="">Select a vendor...</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Line items</label>
          <div className="space-y-2">
            {items.map((li, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" placeholder="Description" value={li.description} onChange={e => updateItem(i, "description", e.target.value)} className="flex-1 border border-gray-300 rounded-md px-3 py-2" />
                <input type="number" placeholder="Qty" value={li.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} className="w-20 border border-gray-300 rounded-md px-3 py-2" />
                <input type="number" step="0.01" placeholder="Unit price" value={li.unit_price} onChange={e => updateItem(i, "unit_price", e.target.value)} className="w-32 border border-gray-300 rounded-md px-3 py-2" />
                <button onClick={() => removeItem(i)} disabled={items.length === 1} className="text-red-600 hover:text-red-800 disabled:opacity-30">x</button>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ Add line item</button>
        </div>
        <div className="border-t pt-3 flex items-center justify-between">
          <div className="text-lg font-medium">Total: ${total.toFixed(2)}</div>
          <button onClick={submit} disabled={submitting || !title || !requester || !vendorId} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}