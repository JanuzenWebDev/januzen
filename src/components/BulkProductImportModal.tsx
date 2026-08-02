import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileText,
  X,
  Search,
  Check,
  Image as ImageIcon,
  ArrowRight,
  Database,
  Tag
} from 'lucide-react';
import { Product } from '../types';

interface BulkProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToken: string;
  onSuccessRefresh: () => void;
}

interface ParsedRow {
  rowIndex: number;
  sku: string;
  name: string;
  shop: 'medicals' | 'stationery' | 'zenora' | 'levra';
  category: string;
  subcategory: string;
  brand: string;
  description: string;
  price: number;
  discountPrice: number;
  stock: number;
  unit: string;
  image: string;
  isActive: boolean;
  isValid: boolean;
  errors: string[];
}

interface ImportSummary {
  totalRows: number;
  validRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errors: Array<{ row: number; error: string }>;
}

export const BulkProductImportModal: React.FC<BulkProductImportModalProps> = ({
  isOpen,
  onClose,
  userToken,
  onSuccessRefresh,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tabs: 'import' | 'export'
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  
  // Import Flow Steps: 1: Select File -> 2: Preview & Validate -> 3: Importing -> 4: Summary Report
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'invalid'>('all');
  const [previewSearch, setPreviewSearch] = useState('');
  
  // Bulk Image URL Auto Match settings
  const [autoMatchImages, setAutoMatchImages] = useState(false);
  const [imageUrlTemplate, setImageUrlTemplate] = useState('https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop');
  
  // Import execution states
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  
  // Export states
  const [exportSector, setExportSector] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // --- SECTOR MAPPING & NORMALIZATION ---
  const normalizeShop = (sectorRaw: any): 'medicals' | 'stationery' | 'zenora' | 'levra' | null => {
    if (!sectorRaw) return null;
    const str = String(sectorRaw).trim().toLowerCase().replace(/[^a-z]/g, '');
    if (str.includes('medical') || str.includes('nuthan')) return 'medicals';
    if (str.includes('stationery') || str.includes('ja')) return 'stationery';
    if (str.includes('zenora')) return 'zenora';
    if (str.includes('levra')) return 'levra';
    return null;
  };

  const getShopDisplayName = (shop: string) => {
    switch (shop) {
      case 'medicals': return 'NuthanMedicals';
      case 'stationery': return 'JA Stationery';
      case 'zenora': return 'Zenora';
      case 'levra': return 'Levra';
      default: return shop;
    }
  };

  // --- DOWNLOAD SAMPLE TEMPLATE ---
  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    const templateData = [
      {
        'SKU': 'JAN-MED-101',
        'Product Name': 'Paracetamol 500mg Tablets',
        'Sector': 'NuthanMedicals',
        'Category': 'General Healthcare',
        'Subcategory': 'Pain Relief',
        'Brand': 'JANUZEN Pharmacy',
        'Description': 'Fast relief from fever and acute bodily aches. Certified standard formulation.',
        'Price': 45.00,
        'Discount Price': 40.00,
        'Stock': 500,
        'Unit': 'pack',
        'Image URL': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop',
        'Product Status': 'Active'
      },
      {
        'SKU': 'JAN-STA-202',
        'Product Name': 'A4 Executive Copier Paper 80GSM (500 Sheets)',
        'Sector': 'JA Stationery',
        'Category': 'Paper Products',
        'Subcategory': 'Printing Paper',
        'Brand': 'JANUZEN Office',
        'Description': 'High-opacity, Jam-free 80GSM premium copier paper suitable for double-sided high-speed printing.',
        'Price': 280.00,
        'Discount Price': 260.00,
        'Stock': 1200,
        'Unit': 'ream',
        'Image URL': 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop',
        'Product Status': 'Active'
      },
      {
        'SKU': 'JAN-ZEN-303',
        'Product Name': 'Ultra Premium Hydrating Facial Serum 50ml',
        'Sector': 'Zenora',
        'Category': 'Skincare',
        'Subcategory': 'Serums',
        'Brand': 'Zenora Luxury',
        'Description': 'Advanced Hyaluronic Acid & Niacinamide formula for glowing skin vitality.',
        'Price': 899.00,
        'Discount Price': 749.00,
        'Stock': 300,
        'Unit': 'bottle',
        'Image URL': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop',
        'Product Status': 'Active'
      },
      {
        'SKU': 'JAN-LEV-404',
        'Product Name': 'Levra Ergonomic Desk Organizer Tray',
        'Sector': 'Levra',
        'Category': 'Workspace',
        'Subcategory': 'Desk Accessories',
        'Brand': 'Levra Essentials',
        'Description': 'Minimalist aluminum desk organizer tray for cables, pens, and accessories.',
        'Price': 499.00,
        'Discount Price': 450.00,
        'Stock': 150,
        'Unit': 'pc',
        'Image URL': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop',
        'Product Status': 'Active'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products_Template');

    if (format === 'csv') {
      XLSX.writeFile(workbook, 'Januzen_Bulk_Products_Template.csv', { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, 'Januzen_Bulk_Products_Template.xlsx', { bookType: 'xlsx' });
    }
  };

  // --- PARSE FILE & VALIDATE ROWS ---
  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to raw array of objects
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          alert('Uploaded file is empty or contains no readable rows.');
          return;
        }

        const skuTracker = new Map<string, number>();

        const parsed: ParsedRow[] = rawRows.map((row, idx) => {
          const rowIndex = idx + 2; // header is row 1
          
          // Flexible key lookup
          const getVal = (keys: string[]) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const k of keys) {
                if (cleanKey === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
                  return String(row[key]).trim();
                }
              }
            }
            return '';
          };

          const rawSku = getVal(['sku', 'productsku', 'itemcode', 'code']);
          const rawName = getVal(['productname', 'name', 'title', 'itemname']);
          const rawSector = getVal(['sector', 'shop', 'division', 'store']);
          const rawCategory = getVal(['category', 'cat']);
          const rawSubcategory = getVal(['subcategory', 'subcat']);
          const rawBrand = getVal(['brand', 'manufacturer']);
          const rawDescription = getVal(['description', 'desc', 'details']);
          const rawPrice = getVal(['price', 'mrp', 'regularprice', 'rate']);
          const rawDiscountPrice = getVal(['discountprice', 'offerprice', 'saleprice', 'discount']);
          const rawStock = getVal(['stock', 'stockquantity', 'quantity', 'qty']);
          const rawUnit = getVal(['unit', 'unitofmeasure', 'uom']);
          let rawImage = getVal(['imageurl', 'image', 'img', 'picture', 'photo']);
          const rawStatus = getVal(['productstatus', 'status', 'isactive', 'active']);

          const rowErrors: string[] = [];

          // Auto-match image URL if missing and enabled
          if (!rawImage && autoMatchImages && rawSku) {
            rawImage = imageUrlTemplate.replace('{SKU}', rawSku);
          } else if (!rawImage && autoMatchImages) {
            rawImage = imageUrlTemplate;
          }

          // Validations
          if (!rawName) rowErrors.push('Missing required Product Name');
          
          const shop = normalizeShop(rawSector);
          if (!shop) {
            rowErrors.push('Invalid Sector/Division. Must be NuthanMedicals, JA Stationery, Zenora, or Levra');
          }

          if (!rawCategory) rowErrors.push('Missing required Category');
          if (!rawDescription) rowErrors.push('Missing required Description');

          const priceNum = parseFloat(rawPrice);
          if (isNaN(priceNum) || priceNum < 0) {
            rowErrors.push('Price must be a valid positive number');
          }

          const stockNum = parseInt(rawStock, 10);
          if (isNaN(stockNum) || stockNum < 0) {
            rowErrors.push('Stock must be a valid non-negative integer');
          }

          if (!rawImage) {
            rowErrors.push('Product Image URL is required');
          } else if (/base64|data:/i.test(rawImage)) {
            rowErrors.push('Image URL cannot contain raw base64 data stream');
          }

          // Duplicate SKU check
          if (rawSku) {
            if (skuTracker.has(rawSku.toLowerCase())) {
              rowErrors.push(`Duplicate SKU "${rawSku}" (also found on row ${skuTracker.get(rawSku.toLowerCase())})`);
            } else {
              skuTracker.set(rawSku.toLowerCase(), rowIndex);
            }
          }

          const discountNum = parseFloat(rawDiscountPrice) || 0;
          const isActive = rawStatus.toLowerCase() !== 'inactive' && rawStatus.toLowerCase() !== 'false' && rawStatus.toLowerCase() !== '0';

          return {
            rowIndex,
            sku: rawSku,
            name: rawName,
            shop: shop || 'medicals',
            category: rawCategory,
            subcategory: rawSubcategory,
            brand: rawBrand || 'JANUZEN',
            description: rawDescription,
            price: priceNum || 0,
            discountPrice: discountNum,
            stock: stockNum || 0,
            unit: rawUnit || 'pc',
            image: rawImage || 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop',
            isActive,
            isValid: rowErrors.length === 0,
            errors: rowErrors
          };
        });

        setParsedRows(parsed);
        setStep(2);
      } catch (err: any) {
        console.error('Error parsing file:', err);
        alert('Failed to parse file: ' + (err.message || String(err)));
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // --- EXECUTE BULK IMPORT (CHUNKED BATCHES) ---
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No valid rows available to import. Please correct errors and re-upload.');
      return;
    }

    setStep(3);
    setIsImporting(true);
    setImportProgress(0);
    setProcessedCount(0);

    const BATCH_SIZE = 500;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    const allErrors: Array<{ row: number; error: string }> = [];

    // Collect invalid rows upfront as failed
    parsedRows.filter(r => !r.isValid).forEach(r => {
      totalFailed++;
      allErrors.push({
        row: r.rowIndex,
        error: r.errors.join('; ')
      });
    });

    const productsToUpload = validRows.map(r => ({
      sku: r.sku || undefined,
      name: r.name,
      shop: r.shop,
      category: r.category,
      subcategory: r.subcategory,
      brand: r.brand,
      description: r.description,
      price: r.price,
      discountPrice: r.discountPrice,
      stock: r.stock,
      unit: r.unit,
      image: r.image,
      isActive: r.isActive
    }));

    const totalBatches = Math.ceil(productsToUpload.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const batch = productsToUpload.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      
      try {
        const response = await fetch('/api/admin/products/bulk-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({ products: batch })
        });

        if (response.ok) {
          const resData = await response.json();
          totalCreated += resData.createdCount || 0;
          totalUpdated += resData.updatedCount || 0;
          if (resData.errors && Array.isArray(resData.errors)) {
            allErrors.push(...resData.errors);
          }
        } else {
          const errData = await response.json().catch(() => ({ error: 'Batch upload failed' }));
          totalFailed += batch.length;
          batch.forEach((b, idx) => {
            allErrors.push({
              row: (i * BATCH_SIZE) + idx + 1,
              error: errData.error || 'Server error processing batch'
            });
          });
        }
      } catch (err: any) {
        totalFailed += batch.length;
        batch.forEach((b, idx) => {
          allErrors.push({
            row: (i * BATCH_SIZE) + idx + 1,
            error: err.message || 'Network error processing batch'
          });
        });
      }

      const currentProcessed = Math.min((i + 1) * BATCH_SIZE, productsToUpload.length);
      setProcessedCount(currentProcessed);
      setImportProgress(Math.round((currentProcessed / productsToUpload.length) * 100));
    }

    setIsImporting(false);
    setSummary({
      totalRows: parsedRows.length,
      validRows: validRows.length,
      createdCount: totalCreated,
      updatedCount: totalUpdated,
      failedCount: totalFailed,
      errors: allErrors
    });
    setStep(4);
    onSuccessRefresh();
  };

  // --- BULK EXPORT PRODUCTS ---
  const handleExportProducts = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/admin/products/export', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products for export');
      }

      const allProducts: Product[] = await response.json();
      
      let filtered = allProducts;
      if (exportSector !== 'all') {
        filtered = allProducts.filter(p => p.shop === exportSector);
      }

      const exportRows = filtered.map(p => ({
        'SKU': p.sku || p.id,
        'Product Name': p.name,
        'Sector': getShopDisplayName(p.shop),
        'Category': p.category,
        'Subcategory': p.subcategory || '',
        'Brand': p.brand || 'JANUZEN',
        'Description': p.description,
        'Price': p.price,
        'Discount Price': p.discountPrice || 0,
        'Stock': p.stock,
        'Unit': p.unit || 'pc',
        'Image URL': p.image,
        'Product Status': p.isActive ? 'Active' : 'Inactive'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Januzen_Products');

      const filename = `Januzen_Products_Export_${exportSector}_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
      XLSX.writeFile(workbook, filename, { bookType: exportFormat });
    } catch (err: any) {
      alert('Export failed: ' + (err.message || String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  // Filtered rows for Preview Table
  const filteredPreviewRows = parsedRows.filter(r => {
    if (filterStatus === 'valid' && !r.isValid) return false;
    if (filterStatus === 'invalid' && r.isValid) return false;
    if (previewSearch) {
      const q = previewSearch.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.shop.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold">Bulk Product Management System</h3>
              <p className="text-xs text-slate-400 font-sans">Import 5,000+ products via CSV/Excel or export inventory dataset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-150 bg-slate-50/80 px-6 shrink-0">
          <button
            onClick={() => { setActiveTab('import'); }}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Upload className="h-4 w-4" />
            Bulk Import Products
          </button>
          <button
            onClick={() => { setActiveTab('export'); }}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Download className="h-4 w-4" />
            Bulk Export Products
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto grow">
          {activeTab === 'export' ? (
            /* --- EXPORT TAB --- */
            <div className="space-y-6 max-w-xl mx-auto py-4">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600 mb-1">
                  <Database className="h-8 w-8" />
                </div>
                <h4 className="font-serif text-lg font-bold text-slate-900">Export Product Catalog</h4>
                <p className="text-xs text-slate-500">
                  Download existing inventory data into CSV or Excel format for bulk editing and re-uploading.
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-gray-200 space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Filter by Division / Sector:</label>
                  <select
                    value={exportSector}
                    onChange={(e) => setExportSector(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">All Divisions (NuthanMedicals, JA Stationery, Zenora, Levra)</option>
                    <option value="medicals">NuthanMedicals Only</option>
                    <option value="stationery">JA Stationery Only</option>
                    <option value="zenora">Zenora Only</option>
                    <option value="levra">Levra Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Export File Format:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExportFormat('xlsx')}
                      className={`p-3 rounded-lg border text-left flex items-center justify-between cursor-pointer ${
                        exportFormat === 'xlsx' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        Excel (.xlsx)
                      </span>
                      {exportFormat === 'xlsx' && <Check className="h-4 w-4 text-emerald-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('csv')}
                      className={`p-3 rounded-lg border text-left flex items-center justify-between cursor-pointer ${
                        exportFormat === 'csv' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        CSV (.csv)
                      </span>
                      {exportFormat === 'csv' && <Check className="h-4 w-4 text-emerald-600" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleExportProducts}
                  disabled={isExporting}
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating File...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download Product Catalog
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* --- IMPORT TAB --- */
            <div className="space-y-6">
              
              {/* Step indicator */}
              <div className="flex items-center justify-between max-w-2xl mx-auto border-b border-gray-150 pb-4 text-xs font-semibold text-gray-400">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-emerald-600 font-bold' : ''}`}>
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>1</span>
                  Select File
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-emerald-600 font-bold' : ''}`}>
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>2</span>
                  Preview & Validate
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                <div className={`flex items-center gap-2 ${step >= 3 ? 'text-emerald-600 font-bold' : ''}`}>
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>3</span>
                  Bulk Upsert
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                <div className={`flex items-center gap-2 ${step >= 4 ? 'text-emerald-600 font-bold' : ''}`}>
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 4 ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>4</span>
                  Summary
                </div>
              </div>

              {/* STEP 1: SELECT FILE */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Template download banner */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-amber-900">Download Ready Template</h5>
                        <p className="text-amber-700">Pre-formatted sheet with SKU, Product Name, Sector, Category, Price, Stock, Image URL, etc.</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleDownloadTemplate('xlsx')}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Excel Template
                      </button>
                      <button
                        onClick={() => handleDownloadTemplate('csv')}
                        className="bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV Template
                      </button>
                    </div>
                  </div>

                  {/* Auto-match Image settings */}
                  <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoMatchImages}
                          onChange={(e) => setAutoMatchImages(e.target.checked)}
                          className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        Enable Automatic Image URL Auto-Fill
                      </label>
                      <span className="text-slate-400 text-[11px]">Fills missing Image URLs dynamically</span>
                    </div>

                    {autoMatchImages && (
                      <div className="pt-2 border-t border-gray-200 space-y-1">
                        <label className="block text-gray-600 font-semibold">Image URL Template (Use {'{SKU}'} variable placeholder):</label>
                        <input
                          type="text"
                          value={imageUrlTemplate}
                          onChange={(e) => setImageUrlTemplate(e.target.value)}
                          placeholder="https://cdn.januzen.in/products/{SKU}.jpg"
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Upload Drop Zone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="p-4 bg-emerald-100 text-emerald-700 rounded-full inline-block group-hover:scale-110 transition-transform mb-3">
                      <Upload className="h-8 w-8" />
                    </div>
                    <h4 className="font-serif text-base font-bold text-slate-800 mb-1">
                      Click or drag CSV / Excel file here
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
                      Supports files containing up to 5,000+ products. Accepted extensions: <span className="font-mono font-bold text-emerald-700">.xlsx, .xls, .csv</span>
                    </p>
                    <span className="inline-block bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs group-hover:bg-emerald-700 transition-colors">
                      Select File From Computer
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 2: PREVIEW & VALIDATE */}
              {step === 2 && (
                <div className="space-y-4">
                  
                  {/* Summary Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-gray-200 text-xs">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="font-bold text-slate-800">
                        File: <span className="font-mono text-emerald-700">{file?.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md font-bold">
                        <span>Total Rows:</span>
                        <span>{parsedRows.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Valid:</span>
                        <span>{validCount}</span>
                      </div>
                      {invalidCount > 0 && (
                        <div className="flex items-center gap-1.5 bg-red-50 text-red-800 px-2.5 py-1 rounded-md font-bold">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Invalid:</span>
                          <span>{invalidCount}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => { setStep(1); setParsedRows([]); setFile(null); }}
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Choose Different File
                      </button>
                      <button
                        onClick={handleExecuteImport}
                        disabled={validCount === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Proceed with Bulk Import ({validCount})
                      </button>
                    </div>
                  </div>

                  {/* Table Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium w-full sm:w-auto">
                      <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${filterStatus === 'all' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        All ({parsedRows.length})
                      </button>
                      <button
                        onClick={() => setFilterStatus('valid')}
                        className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${filterStatus === 'valid' ? 'bg-white font-bold text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        Valid Only ({validCount})
                      </button>
                      <button
                        onClick={() => setFilterStatus('invalid')}
                        className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${filterStatus === 'invalid' ? 'bg-white font-bold text-red-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        Invalid Only ({invalidCount})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Search preview..."
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-gray-200 text-xs py-1.5 pl-8 pr-3 rounded-lg focus:outline-none"
                      />
                      <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Preview Data Table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-100 border-b border-gray-200 text-gray-600 font-mono font-bold uppercase tracking-wider text-[11px] z-10">
                        <tr>
                          <th className="p-3 w-12 text-center">Row</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Sector</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Stock</th>
                          <th className="p-3">Errors / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredPreviewRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-6 text-center text-gray-400">
                              No rows match the filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredPreviewRows.map((row) => (
                            <tr
                              key={row.rowIndex}
                              className={!row.isValid ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50/80'}
                            >
                              <td className="p-3 text-center font-mono font-semibold text-gray-400">
                                #{row.rowIndex}
                              </td>
                              <td className="p-3">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">
                                    <CheckCircle2 className="h-3 w-3" /> Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                    <XCircle className="h-3 w-3" /> Invalid
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono font-bold text-slate-800">
                                {row.sku || <span className="text-gray-300 italic">Auto-ID</span>}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <img src={row.image} referrerPolicy="no-referrer" className="h-7 w-7 object-cover rounded border border-gray-200 shrink-0" />
                                  <span className="font-semibold text-slate-800 line-clamp-1">{row.name}</span>
                                </div>
                              </td>
                              <td className="p-3 font-semibold">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 font-bold">
                                  {getShopDisplayName(row.shop)}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600">{row.category}</td>
                              <td className="p-3 font-mono font-bold">₹{row.price}</td>
                              <td className="p-3 font-mono font-bold text-center">{row.stock}</td>
                              <td className="p-3">
                                {row.isValid ? (
                                  <span className="text-emerald-600 text-[11px] font-medium">Ready to import</span>
                                ) : (
                                  <ul className="list-disc list-inside text-red-600 text-[11px] font-medium space-y-0.5">
                                    {row.errors.map((err, errIdx) => (
                                      <li key={errIdx}>{err}</li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 3: IMPORTING PROGRESS */}
              {step === 3 && (
                <div className="py-12 text-center space-y-6 max-w-lg mx-auto">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="p-5 bg-emerald-100 text-emerald-600 rounded-full animate-pulse">
                      <RefreshCw className="h-10 w-10 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-serif text-xl font-bold text-slate-900">Importing Products to MongoDB</h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Processing chunked bulkWrite requests... {processedCount} / {parsedRows.filter(r => r.isValid).length} products uploaded
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-gray-200 shadow-inner">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-300 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-mono font-bold text-slate-600">
                      <span>{importProgress}% Complete</span>
                      <span>{processedCount} Products</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: SUMMARY REPORT */}
              {step === 4 && summary && (
                <div className="space-y-6 max-w-2xl mx-auto py-2">
                  <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-600 mb-1">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h4 className="font-serif text-xl font-bold text-slate-900">Bulk Import Processed</h4>
                    <p className="text-xs text-slate-500">
                      Summary report of database bulkWrite updates and new product creation.
                    </p>
                  </div>

                  {/* Key Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 text-center">
                      <span className="text-[10px] text-gray-500 uppercase font-bold block">Total Rows</span>
                      <span className="text-xl font-black text-slate-800">{summary.totalRows}</span>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[10px] text-emerald-700 uppercase font-bold block">New Created</span>
                      <span className="text-xl font-black text-emerald-700">+{summary.createdCount}</span>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                      <span className="text-[10px] text-blue-700 uppercase font-bold block">SKU Updated</span>
                      <span className="text-xl font-black text-blue-700">{summary.updatedCount}</span>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-center">
                      <span className="text-[10px] text-red-700 uppercase font-bold block">Failed Rows</span>
                      <span className="text-xl font-black text-red-700">{summary.failedCount}</span>
                    </div>
                  </div>

                  {/* Error detail list if failed > 0 */}
                  {summary.errors.length > 0 && (
                    <div className="bg-red-50/60 border border-red-200 rounded-xl p-4 space-y-2 text-xs">
                      <h5 className="font-bold text-red-900 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        Row Error Log ({summary.errors.length}):
                      </h5>
                      <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-red-100">
                        {summary.errors.map((err, i) => (
                          <div key={i} className="pt-1 font-mono text-[11px] text-red-700">
                            <span className="font-bold">Row #{err.row}:</span> {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
                    <button
                      onClick={() => { setStep(1); setParsedRows([]); setFile(null); }}
                      className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer text-xs"
                    >
                      Import Another File
                    </button>
                    <button
                      onClick={onClose}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl shadow-sm transition-all cursor-pointer text-xs"
                    >
                      Done & Return to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
