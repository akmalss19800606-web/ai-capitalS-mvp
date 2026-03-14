"use client";
import { useState, useRef, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ==================== ТИПЫ ====================
interface ImportResult {
  status: string;
  records_imported: number;
  records_skipped: number;
  errors: string[];
  timestamp: string;
}

interface OneCConfig {
  base_url: string;
  username: string;
  password: string;
  company_name: string;
}

interface OneCTestResult {
  status: string;
  message: string;
  company_name: string | null;
  accounts_found: number;
}

// ==================== EXCEL IMPORT TAB ====================
function ExcelImportPanel({ orgId, onSuccess }: { orgId: number; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [headerRow, setHeaderRow] = useState(1);
  const [sheetName, setSheetName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && /\.(xlsx|xls|csv|tsv)$/i.test(f.name)) {
      setFile(f);
      setResult(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file || !orgId) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const params = new URLSearchParams();
      params.set("header_row", String(headerRow));
      if (sheetName) params.set("sheet_name", sheetName);

      const res = await fetch(
        `${API}/organizations/${orgId}/import/excel?${params}`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ошибка импорта");
      setResult(data);
      if (data.records_imported > 0) onSuccess();
    } catch (e: any) {
      setResult({ status: "error", records_imported: 0, records_skipped: 0, errors: [e.message], timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    window.open(`${API}/import/template`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? "border-blue-500 bg-blue-500/10" : file ? "border-green-500 bg-green-500/5" : "border-gray-600 hover:border-gray-400"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setResult(null); } }}
        />
        {file ? (
          <div>
            <div className="text-4xl mb-2">📄</div>
            <p className="text-white font-medium">{file.name}</p>
            <p className="text-gray-400 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-2">📁</div>
            <p className="text-gray-300">Перетащите файл сюда или нажмите для выбора</p>
            <p className="text-gray-500 text-sm mt-1">XLSX, XLS, CSV, TSV</p>
          </div>
        )}
      </div>

      {/* Настройки */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Строка заголовков</label>
          <input
            type="number" min={1} max={20} value={headerRow}
            onChange={(e) => setHeaderRow(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Лист (для Excel)</label>
          <input
            type="text" value={sheetName} placeholder="Активный"
            onChange={(e) => setSheetName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
          />
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="flex-1 py-2.5 rounded-lg font-medium transition-all disabled:opacity-40 bg-blue-600 hover:bg-blue-500 text-white"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Импортирую...
            </span>
          ) : "📥 Импортировать"}
        </button>
        <button
          onClick={downloadTemplate}
          className="px-4 py-2.5 rounded-lg font-medium border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all"
        >
          📋 Шаблон
        </button>
      </div>

      {/* Результат */}
      {result && (
        <div className={`rounded-lg p-4 ${result.status === "success" && result.records_imported > 0 ? "bg-green-900/30 border border-green-700" : "bg-red-900/30 border border-red-700"}`}>
          {result.status === "success" && result.records_imported > 0 ? (
            <div>
              <p className="text-green-400 font-medium">✅ Импорт завершён</p>
              <p className="text-gray-300 text-sm mt-1">Загружено: {result.records_imported} счетов | Пропущено: {result.records_skipped}</p>
            </div>
          ) : (
            <div>
              <p className="text-red-400 font-medium">❌ Ошибка</p>
              {result.errors.map((e, i) => <p key={i} className="text-gray-400 text-sm">{e}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Инструкция */}
      <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-400">
        <p className="font-medium text-gray-300 mb-2">📌 Формат файла</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Колонки: Счёт (4 цифры НСБУ), Наименование, Дебет, Кредит, Сальдо</li>
          <li>Автоопределение колонок по названиям заголовков</li>
          <li>Поддержка кодировок UTF-8 и Windows-1251</li>
          <li>CSV разделители: запятая, точка с запятой, табуляция</li>
        </ul>
      </div>
    </div>
  );
}


// ==================== 1C ODATA TAB ====================
function OneCPanel({ orgId, onSuccess }: { orgId: number; onSuccess: () => void }) {
  const [config, setConfig] = useState<OneCConfig>({
    base_url: "http://server/base/odata/standard.odata",
    username: "",
    password: "",
    company_name: "",
  });
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testResult, setTestResult] = useState<OneCTestResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [period, setPeriod] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/import/1c/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ status: "error", message: e.message, company_name: null, accounts_found: 0 });
    } finally {
      setTesting(false);
    }
  };

  const doImport = async () => {
    if (!orgId) return;
    setImporting(true);
    setImportResult(null);
    try {
      const params = period ? `?period=${period}` : "";
      const res = await fetch(`${API}/organizations/${orgId}/import/1c${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ошибка импорта");
      setImportResult(data);
      if (data.records_imported > 0) onSuccess();
    } catch (e: any) {
      setImportResult({ status: "error", records_imported: 0, records_skipped: 0, errors: [e.message], timestamp: new Date().toISOString() });
    } finally {
      setImporting(false);
    }
  };

  const updateField = (field: keyof OneCConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Форма подключения */}
      <div className="space-y-3">
        <div>
          <label className="block text-gray-400 text-xs mb-1">URL OData-сервиса 1С</label>
          <input
            type="text" value={config.base_url}
            onChange={(e) => updateField("base_url", e.target.value)}
            placeholder="http://server/base/odata/standard.odata"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-400 text-xs mb-1">Логин 1С</label>
            <input
              type="text" value={config.username}
              onChange={(e) => updateField("username", e.target.value)}
              placeholder="Администратор"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} value={config.password}
                onChange={(e) => updateField("password", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm pr-10"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-400 text-xs mb-1">Название базы (опционально)</label>
            <input
              type="text" value={config.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
              placeholder="ООО Компания"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">Период (YYYY-MM)</label>
            <input
              type="month" value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex gap-3">
        <button
          onClick={testConnection}
          disabled={testing || !config.base_url || !config.username}
          className="flex-1 py-2.5 rounded-lg font-medium transition-all disabled:opacity-40 bg-gray-700 hover:bg-gray-600 text-white"
        >
          {testing ? "⏳ Проверяю..." : "🔌 Тест подключения"}
        </button>
        <button
          onClick={doImport}
          disabled={importing || !config.base_url || !config.username || !orgId}
          className="flex-1 py-2.5 rounded-lg font-medium transition-all disabled:opacity-40 bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          {importing ? "⏳ Импортирую..." : "📥 Импорт из 1С"}
        </button>
      </div>

      {/* Результат теста */}
      {testResult && (
        <div className={`rounded-lg p-4 ${testResult.status === "success" ? "bg-green-900/30 border border-green-700" : "bg-red-900/30 border border-red-700"}`}>
          <p className={testResult.status === "success" ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
            {testResult.status === "success" ? "✅" : "❌"} {testResult.message}
          </p>
          {testResult.accounts_found > 0 && (
            <p className="text-gray-400 text-sm mt-1">Найдено счетов: {testResult.accounts_found}</p>
          )}
        </div>
      )}

      {/* Результат импорта */}
      {importResult && (
        <div className={`rounded-lg p-4 ${importResult.status === "success" && importResult.records_imported > 0 ? "bg-green-900/30 border border-green-700" : "bg-red-900/30 border border-red-700"}`}>
          {importResult.status === "success" && importResult.records_imported > 0 ? (
            <div>
              <p className="text-green-400 font-medium">✅ Импорт из 1С завершён</p>
              <p className="text-gray-300 text-sm mt-1">Загружено: {importResult.records_imported} счетов | Пропущено: {importResult.records_skipped}</p>
            </div>
          ) : (
            <div>
              <p className="text-red-400 font-medium">❌ Ошибка импорта</p>
              {importResult.errors.map((e, i) => <p key={i} className="text-gray-400 text-sm">{e}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Инструкция */}
      <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-400">
        <p className="font-medium text-gray-300 mb-2">📌 Настройка 1С OData</p>
        <ol className="space-y-1 list-decimal list-inside">
          <li>В 1С: Администрирование → Публикация на веб-сервере</li>
          <li>Включите &quot;Публиковать стандартный интерфейс OData&quot;</li>
          <li>URL обычно: http://server/base/odata/standard.odata</li>
          <li>Используйте логин с правами на регистры бухгалтерии</li>
          <li>Нажмите «Тест подключения» для проверки</li>
        </ol>
      </div>
    </div>
  );
}


// ==================== MAIN IMPORT MODAL ====================
export default function ImportModal({
  orgId,
  isOpen,
  onClose,
  onSuccess,
}: {
  orgId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"excel" | "1c">("excel");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">📥 Импорт данных</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab("excel")}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === "excel" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            📊 Excel / CSV
          </button>
          <button
            onClick={() => setActiveTab("1c")}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === "1c" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            🏢 1С OData
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === "excel" ? (
            <ExcelImportPanel orgId={orgId} onSuccess={onSuccess} />
          ) : (
            <OneCPanel orgId={orgId} onSuccess={onSuccess} />
          )}
        </div>
      </div>
    </div>
  );
}
