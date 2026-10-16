import React, { useMemo, useState } from 'react';
import { Archive, Download, Eye, FilePlus, FileText, Pencil, Search, UploadCloud } from 'lucide-react';
import Button from '../components/Button.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { addActivity, formatDate, nextId, todayISO } from '../utils/helpers.js';
import { apiRequest } from '../services/api.js';

const categories = ['Sales Records', 'Procurement Records', 'Inventory Records', 'Supplier Records', 'Customer Records', 'Business Documents', 'Other Records'];
const blankRecord = () => ({ name: '', category: 'Business Documents', relatedTransaction: '', date: todayISO(), description: '', remarks: '', status: 'Active', fileName: '', fileData: '' });

export default function RecordsPage({ data, setData, user, searchValue, notify }) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(blankRecord());
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const records = data.records || [];
  const filtered = useMemo(() => {
    const needle = `${searchValue || ''} ${query}`.trim().toLowerCase();
    return records.filter((record) => `${record.id} ${record.name} ${record.category} ${record.relatedTransaction} ${record.description} ${record.uploadedBy}`.toLowerCase().includes(needle)
      && (categoryFilter === 'All categories' || record.category === categoryFilter)
      && (statusFilter === 'All statuses' || record.status === statusFilter));
  }, [records, query, searchValue, categoryFilter, statusFilter]);

  function openCreate() { setEditing(null); setForm(blankRecord()); setFile(null); setError(''); setModal('form'); }
  function openEdit(record) { setEditing(record); setForm({ ...blankRecord(), ...record }); setFile(null); setError(''); setModal('form'); }
  function update(name, value) { setForm((current) => ({ ...current, [name]: value })); }

  function onFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) { setFile(null); return; }
    if (selected.size > 1024 * 1024) { setError('Attachments must be 1 MB or smaller.'); event.target.value = ''; return; }
    const extension = selected.name.split('.').pop()?.toLowerCase();
    const mimeByExtension = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain', csv: 'text/csv' };
    const allowedMime = mimeByExtension[extension];
    if (!allowedMime) { setError('Allowed attachment types: PDF, PNG, JPEG, TXT, or CSV.'); event.target.value = ''; return; }
    setFile(selected); setError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') { setError('The selected file could not be read.'); return; }
      const encoded = reader.result.includes(',') ? reader.result.slice(reader.result.indexOf(',') + 1) : '';
      update('fileData', `data:${allowedMime};base64,${encoded}`);
    };
    reader.onerror = () => setError('The selected file could not be read.');
    reader.readAsDataURL(selected);
  }

  function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) { setError('Record name is required.'); return; }
    const record = { ...form, name: form.name.trim(), uploadedBy: editing?.uploadedBy || user.name, date: form.date || todayISO(), remarks: form.remarks || '' };
    if (file) { record.fileName = file.name; record.fileData = form.fileData; }
    else if (form.removeFile) { record.fileName = ''; record.fileData = ''; }
    else if (editing) { delete record.fileName; delete record.fileData; }
    else { record.fileName = ''; record.fileData = ''; }
    delete record.removeFile;
    if (editing && record.status === 'Archived' && editing.status !== 'Archived') record.status = 'Active';
    setData((current) => {
      const list = current.records || [];
      const saved = editing ? list.map((item) => item.id === editing.id ? { ...item, ...record, id: editing.id } : item) : [{ ...record, id: nextId('REC', list) }, ...list];
      return addActivity({ ...current, records: saved }, editing ? 'Business record updated' : 'Business record added', `${record.name} · ${record.category}`, 'blue');
    });
    setModal(''); notify(`Record ${editing ? 'updated' : 'created'} successfully.`);
  }

  function archiveRecord(record) {
    if (record.status === 'Archived') {
      setData((current) => addActivity({ ...current, records: current.records.map((item) => item.id === record.id ? { ...item, status: 'Active' } : item) }, 'Business record restored', `${record.name} was restored.`, 'blue'));
      notify('Record restored.');
    } else {
      if (data.settings?.confirmDelete && !window.confirm(`Archive “${record.name}”? It will remain stored and can be restored.`)) return;
      setData((current) => addActivity({ ...current, records: current.records.map((item) => item.id === record.id ? { ...item, status: 'Archived' } : item) }, 'Business record archived', `${record.name} was archived.`, 'orange'));
      notify('Record archived.');
    }
  }

  async function downloadRecord(record) {
    if (record.fileName) {
      try {
        const attachment = await apiRequest(`/records/${encodeURIComponent(record.id)}/file`);
        const link = document.createElement('a'); link.href = attachment.fileData; link.download = attachment.fileName || record.fileName; document.body.appendChild(link); link.click(); link.remove();
        notify('Attachment downloaded.');
      } catch (downloadError) {
        notify(downloadError.message || 'The attachment could not be downloaded.', 'error');
      }
      return;
    }
    const content = `${record.name}\nCategory: ${record.category}\nDate: ${record.date}\nRelated transaction: ${record.relatedTransaction || '—'}\nUploaded by: ${record.uploadedBy}\n\n${record.description || ''}\n\nRemarks: ${record.remarks || ''}`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${record.id}.txt`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('A text copy of the record details was downloaded.');
  }

  return <>
    <PageHeading eyebrow="RECORDS" title="Records Management" description="Organize business documents, link records to transactions, and archive older materials without deleting them." actions={<Button onClick={openCreate}><FilePlus size={15} /> Add record</Button>} />
    <div className="mini-stat-grid"><MiniStat label="Total records" value={records.length} /><MiniStat label="Active records" value={records.filter((item) => item.status === 'Active').length} /><MiniStat label="Archived" value={records.filter((item) => item.status === 'Archived').length} /><MiniStat label="With attachment" value={records.filter((item) => item.fileName).length} /></div>
    <section className="panel data-panel"><div className="data-toolbar"><div className="data-toolbar__title"><FileText size={17} /><div><strong>Business record register</strong><small>Supported attachments up to 1 MB are validated and stored with their record in MongoDB.</small></div></div><div className="data-toolbar__filters"><label className="local-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." /></label><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Active</option><option>Archived</option></select></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Record ID</th><th>Record name</th><th>Category</th><th>Related transaction</th><th>Date</th><th>Uploaded by</th><th>Document</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td><span className="id-text">{record.id}</span></td><td><strong className="table-primary">{record.name}</strong><small className="table-secondary">{record.description || 'No description'}</small></td><td>{record.category}</td><td>{record.relatedTransaction || '—'}</td><td>{formatDate(record.date)}</td><td>{record.uploadedBy}</td><td>{record.fileName ? <span className="file-pill"><UploadCloud size={12} /> {record.fileName}</span> : <span className="table-muted">Text only</span>}</td><td><StatusBadge status={record.status} /></td><td><div className="row-actions"><button type="button" className="row-action" title="View details" onClick={() => { setViewing(record); setModal('view'); }}><Eye size={15} /></button><button type="button" className="row-action" title="Edit" onClick={() => openEdit(record)}><Pencil size={15} /></button><button type="button" className="row-action" title="Download details or attachment" onClick={() => downloadRecord(record)}><Download size={15} /></button><button type="button" className="row-action row-action--muted" title={record.status === 'Archived' ? 'Restore record' : 'Archive record'} onClick={() => archiveRecord(record)}><Archive size={15} /></button></div></td></tr>)}{!filtered.length && <tr><td colSpan="9" className="empty-state">No records match the selected filters.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {filtered.length} of {records.length} records</span><span>Archive preserves existing record data</span></div></section>
    <Modal open={modal === 'form'} title={`${editing ? 'Edit' : 'Add'} business record`} description="Enter the document details and optionally attach a supported file." onClose={() => setModal('')} wide>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-field"><label>Record name <span className="required-mark">*</span></label><input value={form.name} onChange={(event) => update('name', event.target.value)} required /></div>
        <div className="form-field"><label>Category</label><select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="form-field"><label>Related transaction</label><select value={form.relatedTransaction} onChange={(event) => update('relatedTransaction', event.target.value)}><option value="">None</option>{data.transactions.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.customer}</option>)}{data.procurements.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.supplier}</option>)}</select></div>
        <div className="form-field"><label>Record date</label><input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} required /></div>
        <div className="form-field form-field--full"><label>Description</label><textarea rows={3} value={form.description} onChange={(event) => update('description', event.target.value)} /></div>
        <div className="form-field form-field--full"><label>Attachment</label><input type="file" onChange={onFileChange} /><small className="field-help">{form.fileName ? `Current attachment: ${form.fileName}. Choose another file to replace it.` : 'Optional. Attachments are validated and saved in the database (PDF, PNG, JPEG, TXT, or CSV; max 1 MB).'} </small>{form.fileName && <label className="checkbox-line"><input type="checkbox" checked={form.removeFile || false} onChange={(event) => { update('removeFile', event.target.checked); if (event.target.checked) { update('fileName', ''); update('fileData', ''); setFile(null); } }} /> Remove existing attachment</label>}</div>
        <div className="form-field form-field--full"><label>Remarks</label><textarea rows={2} value={form.remarks} onChange={(event) => update('remarks', event.target.value)} /></div>
        {error && <div className="form-error form-field--full">{error}</div>}
        <div className="form-actions form-field--full"><Button variant="secondary" onClick={() => setModal('')}>Cancel</Button><Button type="submit">{editing ? 'Save changes' : 'Create record'}</Button></div>
      </form>
    </Modal>
    <Modal open={modal === 'view' && Boolean(viewing)} title={viewing?.name || 'Record details'} description={viewing?.id} onClose={() => { setModal(''); setViewing(null); }}>
      {viewing && <div className="detail-grid"><Detail label="Category" value={viewing.category} /><Detail label="Related transaction" value={viewing.relatedTransaction || '—'} /><Detail label="Date" value={formatDate(viewing.date)} /><Detail label="Uploaded by" value={viewing.uploadedBy} /><Detail label="Status" value={<StatusBadge status={viewing.status} />} /><Detail label="Attachment" value={viewing.fileName || 'No attachment'} /><Detail label="Description" value={viewing.description || '—'} /><Detail label="Remarks" value={viewing.remarks || '—'} /></div>}
      <div className="form-actions"><Button variant="secondary" onClick={() => { setModal(''); setViewing(null); }}>Close</Button>{viewing && <Button onClick={() => downloadRecord(viewing)}><Download size={14} /> Download</Button>}</div>
    </Modal>
  </>;
}
function MiniStat({ label, value }) { return <div className="mini-stat"><span>{label}</span><strong>{value}</strong></div>; }
function Detail({ label, value }) { return <div className="detail-field"><span>{label}</span><strong>{value || '—'}</strong></div>; }
