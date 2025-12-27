import { useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useLocations } from '@/hooks/useLocations';
import { useUsers } from '@/hooks/useUsers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { LEAD_STATUS_CONFIG, LeadStatus } from '@/types';
import { BulkUploadRow } from '@/types/extended';
import { 
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle, 
  XCircle, Loader2, Download, RefreshCw
} from 'lucide-react';

interface ParsedRow extends BulkUploadRow {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
}

interface UploadSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
}

export default function BulkUploadPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: locations } = useLocations();
  const { data: users } = useUsers();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [autoAssignLocation, setAutoAssignLocation] = useState<string>('');
  const [defaultStatus, setDefaultStatus] = useState<LeadStatus>('open');
  const [uploadProgress, setUploadProgress] = useState(0);

  const locationMap = new Map(locations?.map(l => [l.name.toLowerCase(), l.id]));
  const userMap = new Map(users?.filter(u => u.is_active).map(u => [u.full_name.toLowerCase(), u.user_id]));

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setParsedRows([]);
    setSummary(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        toast.error('File must contain headers and at least one data row');
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
      const headerMap: Record<string, number> = {};
      headers.forEach((h, i) => headerMap[h] = i);

      // Check required columns
      const requiredColumns = ['name', 'phone', 'location'];
      const missingColumns = requiredColumns.filter(col => 
        !headers.some(h => h.includes(col))
      );

      if (missingColumns.length > 0) {
        toast.error(`Missing required columns: ${missingColumns.join(', ')}`);
        return;
      }

      // Get name column index
      const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('full'));
      const phoneIdx = headers.findIndex(h => h.includes('phone'));
      const locationIdx = headers.findIndex(h => h.includes('location'));
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const propertyIdx = headers.findIndex(h => h.includes('property'));
      const budgetIdx = headers.findIndex(h => h.includes('budget'));
      const statusIdx = headers.findIndex(h => h.includes('status'));
      const assignedIdx = headers.findIndex(h => h.includes('assigned'));
      const sourceIdx = headers.findIndex(h => h.includes('source'));
      const commentsIdx = headers.findIndex(h => h.includes('comment') || h.includes('notes'));

      // Fetch existing phone numbers for duplicate check
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('phone');
      const existingPhones = new Set(existingLeads?.map(l => l.phone.replace(/\D/g, '')));

      const parsed: ParsedRow[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const errors: string[] = [];

        const name = row[nameIdx]?.trim() || '';
        const phone = row[phoneIdx]?.trim() || '';
        const location = row[locationIdx]?.trim() || '';
        const email = emailIdx >= 0 ? row[emailIdx]?.trim() : '';
        const propertyType = propertyIdx >= 0 ? row[propertyIdx]?.trim() : '';
        const budget = budgetIdx >= 0 ? row[budgetIdx]?.trim() : '';
        const status = statusIdx >= 0 ? row[statusIdx]?.trim().toLowerCase() : '';
        const assignedTo = assignedIdx >= 0 ? row[assignedIdx]?.trim() : '';
        const source = sourceIdx >= 0 ? row[sourceIdx]?.trim() : '';
        const comments = commentsIdx >= 0 ? row[commentsIdx]?.trim() : '';

        // Validation
        if (!name) errors.push('Name is required');
        if (!phone) errors.push('Phone is required');
        if (!location) errors.push('Location is required');

        // Validate location exists
        const locationId = locationMap.get(location.toLowerCase());
        if (location && !locationId) {
          errors.push(`Location "${location}" not found`);
        }

        // Validate assigned user exists
        const assignedUserId = userMap.get(assignedTo.toLowerCase());
        if (assignedTo && !assignedUserId) {
          errors.push(`User "${assignedTo}" not found`);
        }

        // Validate status
        const validStatus = status && Object.keys(LEAD_STATUS_CONFIG).includes(status);
        if (status && !validStatus) {
          errors.push(`Invalid status "${status}"`);
        }

        // Check duplicate
        const cleanPhone = phone.replace(/\D/g, '');
        const isDuplicate = existingPhones.has(cleanPhone);

        parsed.push({
          rowNumber: i + 1,
          name,
          phone,
          location,
          email,
          property_type: propertyType,
          budget,
          status: validStatus ? status : undefined,
          assigned_to: assignedTo,
          source,
          comments,
          isValid: errors.length === 0,
          errors,
          isDuplicate,
        });
      }

      setParsedRows(parsed);
      setSummary({
        total: parsed.length,
        valid: parsed.filter(r => r.isValid && !r.isDuplicate).length,
        invalid: parsed.filter(r => !r.isValid).length,
        duplicates: parsed.filter(r => r.isDuplicate).length,
      });

    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse file');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpload = async () => {
    const validRows = parsedRows.filter(r => r.isValid && !r.isDuplicate);
    if (validRows.length === 0) {
      toast.error('No valid rows to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < validRows.length; i += batchSize) {
        batches.push(validRows.slice(i, i + batchSize));
      }

      let processed = 0;
      
      for (const batch of batches) {
        const leadsToInsert = batch.map(row => ({
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          location_id: locationMap.get(row.location.toLowerCase()) || (autoAssignLocation || null),
          property_type: row.property_type || null,
          budget: row.budget || null,
          status: (row.status as LeadStatus) || defaultStatus,
          assigned_to: userMap.get((row.assigned_to || '').toLowerCase()) || null,
          lead_source: row.source || 'Bulk Upload',
          notes: row.comments || null,
          created_by: user?.id,
        }));

        const { error } = await supabase.from('leads').insert(leadsToInsert);
        if (error) throw error;

        processed += batch.length;
        setUploadProgress((processed / validRows.length) * 100);
      }

      // Log the bulk upload
      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        action: 'bulk_upload',
        entity_type: 'leads',
        new_value: { 
          total_rows: validRows.length,
          source: 'csv_upload'
        },
      }]);

      toast.success(`Successfully uploaded ${validRows.length} leads`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      // Reset state
      setParsedRows([]);
      setSummary(null);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Phone', 'Location', 'Email', 'Property Type', 'Budget', 'Status', 'Assigned To', 'Source', 'Comments'];
    const sampleRow = ['John Doe', '+91 9876543210', 'Mumbai', 'john@email.com', 'Apartment', '50L - 1Cr', 'open', 'Sales Rep', 'Website', 'Interested in 2BHK'];
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Upload className="w-6 h-6" /> Bulk Lead Upload
          </h1>
          <p className="text-sm text-muted-foreground">
            Import leads from CSV or Excel files
          </p>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload File</CardTitle>
            <CardDescription>
              Upload a CSV file with lead data. Required columns: Name, Phone, Location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {isProcessing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground">CSV, XLSX (max 10,000 rows)</p>
                      </div>
                    </>
                  )}
                </label>
              </div>
              
              <div className="sm:w-64 space-y-3">
                <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
                  <Download className="w-4 h-4" /> Download Template
                </Button>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Status</label>
                  <Select value={defaultStatus} onValueChange={(v) => setDefaultStatus(v as LeadStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAD_STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview & Summary */}
        {summary && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-secondary rounded-lg">
                    <p className="text-2xl font-bold">{summary.total}</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="text-center p-3 bg-status-closed/10 rounded-lg">
                    <p className="text-2xl font-bold text-status-closed">{summary.valid}</p>
                    <p className="text-sm text-muted-foreground">Valid</p>
                  </div>
                  <div className="text-center p-3 bg-destructive/10 rounded-lg">
                    <p className="text-2xl font-bold text-destructive">{summary.invalid}</p>
                    <p className="text-sm text-muted-foreground">Invalid</p>
                  </div>
                  <div className="text-center p-3 bg-status-follow-up/10 rounded-lg">
                    <p className="text-2xl font-bold text-status-follow-up">{summary.duplicates}</p>
                    <p className="text-sm text-muted-foreground">Duplicates</p>
                  </div>
                </div>

                {isUploading && (
                  <div className="mt-4 space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-center text-muted-foreground">
                      Uploading... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <Button 
                    variant="gradient" 
                    className="gap-2"
                    onClick={handleUpload}
                    disabled={summary.valid === 0 || isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Upload {summary.valid} Valid Leads
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { setParsedRows([]); setSummary(null); }}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview (First 50 rows)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 50).map((row) => (
                        <TableRow key={row.rowNumber} className={!row.isValid ? 'bg-destructive/5' : row.isDuplicate ? 'bg-status-follow-up/5' : ''}>
                          <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                          <TableCell>
                            {row.isValid && !row.isDuplicate ? (
                              <CheckCircle className="w-4 h-4 text-status-closed" />
                            ) : row.isDuplicate ? (
                              <AlertTriangle className="w-4 h-4 text-status-follow-up" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>{row.phone}</TableCell>
                          <TableCell>{row.location}</TableCell>
                          <TableCell>
                            {row.isDuplicate && (
                              <Badge variant="outline" className="text-xs">Duplicate phone</Badge>
                            )}
                            {row.errors.map((err, i) => (
                              <Badge key={i} variant="destructive" className="text-xs mr-1">
                                {err}
                              </Badge>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedRows.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Showing 50 of {parsedRows.length} rows
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
