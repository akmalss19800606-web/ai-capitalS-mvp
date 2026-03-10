'use client';
import { useEffect, useState, useRef } from 'react';
import { dataExchange } from '../../lib/api';

/* ─── Типы ──────────────────────────────────────────────────── */

interface TargetField {
  field: string;
  label: string;
  field_type: string;
  required: boolean;
}

interface MappingRow {
  source_field: string;
  target_field: string;
  transform_rule: string;
  default_value: string;
  is_required: boolean;
}

interface ImportJob {
  id: number;
  filename: string;
  file_format: string;
  target_entity: string;
  status: string;
  total_rows: number | null;
  imported_rows: number;
  skipped_rows: number;
  error_rows: number;
  errors_detail: Array<{ row: number; field: string; error: string }> | null;
  preview_data: Array<Record<string, unknown>> | null;
  raw_headers: string[] | null;
  field_mappings: Array<{
    id: number;
    source_field: string;
    target_field: string;
    transform_rule: string | null;
    default_value: string | null;
    is_required: boolean;
  }>;
  created_at: string;
  completed_at: string | null;
}

interface ExportJob {
  id: number;
  export_format: string;
  target_entity: string;
  filters: Record<string, unknown> | null;
  status: string;
  total_rows: number | null;
  result_data: unknown;
  created_at: string;
  completed_at: string | null;
}

/* ─── Цвета ─────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  uploaded: { bg: '#dbeafe', text: '#1d4ed8' },
  mapping: { bg: '#fef3c7', text: '#92400e' },
  validating: { bg: '#e0e7ff', text: '#4338ca' },
  executing: { bg: '#fef3c7', text: '#92400e' },
  generating: { bg: '#fef3c7', text: '#92400e' },
  completed: { bg: '#dcfce7', text: '#166534' },
  failed: { bg: '#fee2e2', text: '#991b1b' },
  pending: { bg: '#f1f5f9', text: '#475569' },
};

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Загружен',
  mapping: 'Маппинг',
  validating: 'Валидация',
  executing: 'Выполнение',
  generating: 'Генерация',
  completed: 'Завершён',
  failed: 'Ошибка',
  pending: 'Ожидание',
};

const TRANSFORM_RULES = [
  { value: '', label: 'Без преобразования' },
  { value: 'uppercase', label: 'ВЕРХНИЙ РЕГИСТР' },
  { value: 'lowercase', label: 'нижний регистр' },
  { value: 'date_parse', label: 'Дата (автопарсинг)' },
  { value: 'number_parse', label: 'Число (автопарсинг)' },
];

const ENTITY_OPTIONS = [
  { value: 'decisions', label: 'Инвестиционные решения' },
  { value: 'portfolios', label: 'Портфели' },
];

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
];

/* ─── Компонент ─────────────────────────────────────────────── */

export default function DataExchangePage() {
  /* === Tabs === */
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'history'>('import');

  /* === Import state === */
  const fileRef = useRef<HTMLInputElement>(null);
  const [importEntity, setImportEntity] = useState('decisions');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [targetFields, setTargetFields] = useState<TargetField[]>([]);
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'result'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* === Export state === */
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportEntity, setExportEntity] = useState('decisions');
  const [exportResult, setExportResult] = useState<ExportJob | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  /* === History state === */
  const [importHistory, setImportHistory] = useState<ImportJob[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Загрузка целевых полей при смене entity
  useEffect(() => {
    dataExchange.targetFields(importEntity).then(setTargetFields).catch(() => {});
  }, [importEntity]);

  // Загрузка истории при переключении на вкладку
  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const [imp, exp] = await Promise.all([
        dataExchange.listImports(),
        dataExchange.listExports(),
      ]);
      setImportHistory(imp);
      setExportHistory(exp);
    } catch {}
    setHistoryLoading(false);
  };

  /* === Import handlers === */

  const handleUpload = async () => {
    if (!importFile) return;
    setLoading(true);
    setError('');
    try {
      const job = await dataExchange.uploadImport(importFile, importEntity);
      setCurrentJob(job);
      // Автоматически создать маппинг из заголовков
      if (job.raw_headers && targetFields.length > 0) {
        const autoMappings: MappingRow[] = job.raw_headers.map((h: string) => {
          const match = targetFields.find(
            (tf) => tf.field.toLowerCase() === h.toLowerCase() || tf.label.toLowerCase() === h.toLowerCase()
          );
          return {
            source_field: h,
            target_field: match ? match.field : '',
            transform_rule: '',
            default_value: '',
            is_required: match ? match.required : false,
          };
        });
        setMappings(autoMappings);
      }
      setImportStep('mapping');
    } catch (e: unknown) {
      setError(e.message || 'Ошибка загрузки файла');
    }
    setLoading(false);
  };

  const handleSaveMapping = async () => {
    if (!currentJob) return;
    const validMappings = mappings.filter((m) => m.target_field);
    if (validMappings.length === 0) {
      setError('Настройте хотя бы одно соответствие полей');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const updated = await dataExchange.saveMapping(currentJob.id, validMappings);
      setCurrentJob(updated);
    } catch (e: unknown) {
      setError(e.message || 'Ошибка сохранения маппинга');
    }
    setLoading(false);
  };

  const handleExecuteImport = async () => {
    if (!currentJob || !importFile) return;
    setLoading(true);
    setError('');
    try {
      const result = await dataExchange.executeImport(currentJob.id, importFile);
      setCurrentJob(result);
      setImportStep('result');
    } catch (e: unknown) {
      setError(e.message || 'Ошибка выполнения импорта');
    }
    setLoading(false);
  };

  const resetImport = () => {
    setImportFile(null);
    setCurrentJob(null);
    setMappings([]);
    setImportStep('upload');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  /* === Export handlers === */

  const handleExport = async () => {
    setExportLoading(true);
    setExportResult(null);
    try {
      const job = await dataExchange.createExport({
        export_format: exportFormat,
        target_entity: exportEntity,
      });
      setExportResult(job);
    } catch (e: unknown) {
      setError(e.message || 'Ошибка экспорта');
    }
    setExportLoading(false);
  };

  const downloadExport = () => {
    if (!exportResult?.result_data) return;
    const { type, content, data } = exportResult.result_data;
    let blob: Blob;
    let filename: string;

    if (type === 'csv') {
      blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      filename = `export_${exportResult.target_entity}_${exportResult.id}.csv`;
    } else if (type === 'json') {
      blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
      filename = `export_${exportResult.target_entity}_${exportResult.id}.json`;
    } else if (type === 'xlsx') {
      // Для XLSX отдаём JSON-данные (табличный формат)
      const jsonStr = JSON.stringify(data, null, 2);
      blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      filename = `export_${exportResult.target_entity}_${exportResult.id}_data.json`;
    } else {
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* === Styles === */

  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '20px',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '10px 22px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: '#fff',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  const btnOutline: React.CSSProperties = {
    padding: '10px 22px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#475569',
    fontWeight: '500',
    fontSize: '13px',
    cursor: 'pointer',
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    background: '#fff',
    cursor: 'pointer',
  };

  const statusBadge = (status: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: STATUS_COLORS[status]?.bg || '#f1f5f9',
    color: STATUS_COLORS[status]?.text || '#475569',
  });

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    borderRadius: '8px 8px 0 0',
    border: 'none',
    borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
    background: active ? '#fff' : 'transparent',
    color: active ? '#1e293b' : '#64748b',
    fontWeight: active ? '600' : '400',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '13px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
  };

  /* === Render === */

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
          Импорт / Экспорт данных
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Загрузка данных из внешних источников и выгрузка в различных форматах (EXCH-IO-001)
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button style={tabBtn(activeTab === 'import')} onClick={() => setActiveTab('import')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Импорт
          </span>
        </button>
        <button style={tabBtn(activeTab === 'export')} onClick={() => setActiveTab('export')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Экспорт
          </span>
        </button>
        <button style={tabBtn(activeTab === 'history')} onClick={() => setActiveTab('history')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            История
          </span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{ border: 'none', background: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: '600' }}
          >
            ×
          </button>
        </div>
      )}

      {/* ═══════ IMPORT TAB ═══════ */}
      {activeTab === 'import' && (
        <>
          {/* Step indicator */}
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px' }}>
            {['Загрузка файла', 'Маппинг полей', 'Результат'].map((step, i) => {
              const stepKeys: Array<'upload' | 'mapping' | 'result'> = ['upload', 'mapping', 'result'];
              const isActive = stepKeys[i] === importStep;
              const isDone = stepKeys.indexOf(importStep) > i;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {i > 0 && (
                    <div style={{ width: '40px', height: '2px', background: isDone ? '#3b82f6' : '#e2e8f0', borderRadius: '1px' }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: isDone ? '#3b82f6' : isActive ? '#3b82f6' : '#e2e8f0',
                        color: isDone || isActive ? '#fff' : '#94a3b8',
                      }}
                    >
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: isActive ? '600' : '400', color: isActive ? '#1e293b' : '#64748b' }}>
                      {step}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 1: Upload */}
          {importStep === 'upload' && (
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
                Загрузка файла
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                    Целевая сущность
                  </label>
                  <select value={importEntity} onChange={(e) => setImportEntity(e.target.value)} style={selectStyle}>
                    {ENTITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                    Файл (CSV, TSV, JSON, XML)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.tsv,.json,.xml"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    style={inputStyle}
                  />
                </div>
              </div>
              {importFile && (
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#475569' }}>
                  Файл: <strong>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(1)} КБ)
                </div>
              )}
              <button
                style={{ ...btnPrimary, opacity: !importFile || loading ? 0.6 : 1 }}
                onClick={handleUpload}
                disabled={!importFile || loading}
              >
                {loading ? 'Загрузка...' : 'Загрузить и проанализировать'}
              </button>
            </div>
          )}

          {/* Step 2: Mapping */}
          {importStep === 'mapping' && currentJob && (
            <>
              {/* Preview */}
              {currentJob.preview_data && currentJob.preview_data.length > 0 && (
                <div style={card}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                    Предпросмотр данных
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                    {currentJob.filename} — {currentJob.total_rows} строк, формат: {currentJob.file_format?.toUpperCase()}
                  </p>
                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {currentJob.raw_headers?.map((h) => (
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentJob.preview_data.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {currentJob.raw_headers?.map((h) => (
                              <td key={h} style={tdStyle}>
                                {String(row[h] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Mapping table */}
              <div style={card}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                  Маппинг полей
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                  Настройте соответствие полей файла внутренним полям системы
                </p>
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Поле из файла</th>
                        <th style={thStyle}>Целевое поле</th>
                        <th style={thStyle}>Преобразование</th>
                        <th style={thStyle}>Значение по умолчанию</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Обязат.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map((m, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: '500', fontFamily: 'monospace', fontSize: '12px' }}>
                              {m.source_field}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <select
                              value={m.target_field}
                              onChange={(e) => {
                                const next = [...mappings];
                                next[i] = { ...next[i], target_field: e.target.value };
                                setMappings(next);
                              }}
                              style={{ ...selectStyle, width: '200px' }}
                            >
                              <option value="">— не импортировать —</option>
                              {targetFields.map((tf) => (
                                <option key={tf.field} value={tf.field}>
                                  {tf.label} ({tf.field})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={tdStyle}>
                            <select
                              value={m.transform_rule}
                              onChange={(e) => {
                                const next = [...mappings];
                                next[i] = { ...next[i], transform_rule: e.target.value };
                                setMappings(next);
                              }}
                              style={{ ...selectStyle, width: '180px' }}
                            >
                              {TRANSFORM_RULES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </td>
                          <td style={tdStyle}>
                            <input
                              value={m.default_value}
                              onChange={(e) => {
                                const next = [...mappings];
                                next[i] = { ...next[i], default_value: e.target.value };
                                setMappings(next);
                              }}
                              placeholder="—"
                              style={{ ...inputStyle, width: '140px' }}
                            />
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={m.is_required}
                              onChange={(e) => {
                                const next = [...mappings];
                                next[i] = { ...next[i], is_required: e.target.checked };
                                setMappings(next);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button style={btnPrimary} onClick={handleSaveMapping} disabled={loading}>
                    {loading ? 'Сохранение...' : 'Сохранить маппинг'}
                  </button>
                  {currentJob.status === 'mapping' && (
                    <button
                      style={{ ...btnPrimary, background: 'linear-gradient(135deg, #059669, #10b981)' }}
                      onClick={handleExecuteImport}
                      disabled={loading}
                    >
                      {loading ? 'Импорт...' : 'Выполнить импорт'}
                    </button>
                  )}
                  <button style={btnOutline} onClick={resetImport}>
                    Сбросить
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Result */}
          {importStep === 'result' && currentJob && (
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
                Результат импорта
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#166534' }}>{currentJob.imported_rows}</div>
                  <div style={{ fontSize: '11px', color: '#15803d', marginTop: '4px' }}>Импортировано</div>
                </div>
                <div style={{ padding: '14px', background: '#eff6ff', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1d4ed8' }}>{currentJob.total_rows ?? 0}</div>
                  <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px' }}>Всего строк</div>
                </div>
                <div style={{ padding: '14px', background: '#fefce8', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#854d0e' }}>{currentJob.skipped_rows}</div>
                  <div style={{ fontSize: '11px', color: '#a16207', marginTop: '4px' }}>Пропущено</div>
                </div>
                <div style={{ padding: '14px', background: '#fef2f2', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#991b1b' }}>{currentJob.error_rows}</div>
                  <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>Ошибок</div>
                </div>
              </div>

              {/* Errors detail */}
              {currentJob.errors_detail && currentJob.errors_detail.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>
                    Детали ошибок
                  </h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, background: '#fef2f2' }}>Строка</th>
                          <th style={{ ...thStyle, background: '#fef2f2' }}>Поле</th>
                          <th style={{ ...thStyle, background: '#fef2f2' }}>Ошибка</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentJob.errors_detail.map((err, i) => (
                          <tr key={i}>
                            <td style={tdStyle}>{err.row}</td>
                            <td style={tdStyle}>{err.field || '—'}</td>
                            <td style={{ ...tdStyle, color: '#991b1b' }}>{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={statusBadge(currentJob.status)}>
                  {STATUS_LABELS[currentJob.status] || currentJob.status}
                </span>
                <button style={btnOutline} onClick={resetImport}>
                  Новый импорт
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════ EXPORT TAB ═══════ */}
      {activeTab === 'export' && (
        <div style={card}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
            Экспорт данных
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Сущность для экспорта
              </label>
              <select value={exportEntity} onChange={(e) => setExportEntity(e.target.value)} style={selectStyle}>
                {ENTITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Формат
              </label>
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} style={selectStyle}>
                {FORMAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              style={{ ...btnPrimary, opacity: exportLoading ? 0.6 : 1 }}
              onClick={handleExport}
              disabled={exportLoading}
            >
              {exportLoading ? 'Генерация...' : 'Экспортировать'}
            </button>
          </div>

          {/* Export result */}
          {exportResult && (
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                borderRadius: '10px',
                background: exportResult.status === 'completed' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${exportResult.status === 'completed' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <span style={statusBadge(exportResult.status)}>
                    {STATUS_LABELS[exportResult.status] || exportResult.status}
                  </span>
                  <span style={{ marginLeft: '12px', fontSize: '13px', color: '#475569' }}>
                    {exportResult.total_rows} записей
                  </span>
                </div>
                {exportResult.status === 'completed' && (
                  <button style={btnPrimary} onClick={downloadExport}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Скачать файл
                  </button>
                )}
              </div>

              {/* Preview exported data */}
              {exportResult.status === 'completed' && exportResult.result_data?.type === 'csv' && (
                <details>
                  <summary style={{ fontSize: '12px', color: '#475569', cursor: 'pointer', marginBottom: '8px' }}>
                    Предпросмотр (CSV)
                  </summary>
                  <pre
                    style={{
                      background: '#fff',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {exportResult.result_data.content?.substring(0, 2000)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════ HISTORY TAB ═══════ */}
      {activeTab === 'history' && (
        <>
          {historyLoading ? (
            <div style={{ ...card, textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '40px' }}>
              Загрузка истории...
            </div>
          ) : (
            <>
              {/* Import history */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
                    История импорта
                  </h3>
                  <button style={btnOutline} onClick={loadHistory}>Обновить</button>
                </div>
                {importHistory.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                    Импортов пока нет
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>ID</th>
                          <th style={thStyle}>Файл</th>
                          <th style={thStyle}>Сущность</th>
                          <th style={thStyle}>Статус</th>
                          <th style={thStyle}>Строки</th>
                          <th style={thStyle}>Ошибки</th>
                          <th style={thStyle}>Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importHistory.map((job) => (
                          <tr key={job.id}>
                            <td style={tdStyle}>#{job.id}</td>
                            <td style={tdStyle}>{job.filename}</td>
                            <td style={tdStyle}>
                              {ENTITY_OPTIONS.find((e) => e.value === job.target_entity)?.label || job.target_entity}
                            </td>
                            <td style={tdStyle}>
                              <span style={statusBadge(job.status)}>
                                {STATUS_LABELS[job.status] || job.status}
                              </span>
                            </td>
                            <td style={tdStyle}>{job.imported_rows}/{job.total_rows ?? '?'}</td>
                            <td style={tdStyle}>{job.error_rows}</td>
                            <td style={{ ...tdStyle, fontSize: '11px', color: '#94a3b8' }}>
                              {new Date(job.created_at).toLocaleString('ru-RU')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Export history */}
              <div style={card}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '14px' }}>
                  История экспорта
                </h3>
                {exportHistory.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                    Экспортов пока нет
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>ID</th>
                          <th style={thStyle}>Сущность</th>
                          <th style={thStyle}>Формат</th>
                          <th style={thStyle}>Статус</th>
                          <th style={thStyle}>Записей</th>
                          <th style={thStyle}>Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportHistory.map((job) => (
                          <tr key={job.id}>
                            <td style={tdStyle}>#{job.id}</td>
                            <td style={tdStyle}>
                              {ENTITY_OPTIONS.find((e) => e.value === job.target_entity)?.label || job.target_entity}
                            </td>
                            <td style={tdStyle}>{job.export_format?.toUpperCase()}</td>
                            <td style={tdStyle}>
                              <span style={statusBadge(job.status)}>
                                {STATUS_LABELS[job.status] || job.status}
                              </span>
                            </td>
                            <td style={tdStyle}>{job.total_rows ?? '—'}</td>
                            <td style={{ ...tdStyle, fontSize: '11px', color: '#94a3b8' }}>
                              {new Date(job.created_at).toLocaleString('ru-RU')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
