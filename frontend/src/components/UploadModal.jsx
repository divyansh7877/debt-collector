import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { CloudUpload, CheckCircle, AlertCircle } from 'lucide-react';

import { uploadFile, addUserManual } from '../api/services.js';
import { fetchUsers, fetchAnalytics } from '../features/users/usersSlice.js';

const UploadModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDueDate, setManualDueDate] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (!acceptedFiles.length) return;
      setError(null);
      setSuccess(null);
      setLoading(true);
      try {
        const file = acceptedFiles[0];
        const response = await uploadFile(file);
        dispatch(fetchUsers());
        dispatch(fetchAnalytics());

        // Handle CSV response (may have multiple users)
        if (response.data?.users && Array.isArray(response.data.users)) {
          const count = response.data.users.length;
          setSuccess(`Successfully uploaded ${count} user(s) from CSV file`);
        } else {
          setSuccess('File uploaded successfully');
        }

        // Reset form after a delay
        setTimeout(() => {
          setManualName('');
          setManualAmount('');
          setManualDueDate('');
          setSuccess(null);
          onClose();
        }, 2000);
      } catch (e) {
        console.error(e);
        setError(e.response?.data?.detail || 'Failed to upload file');
      } finally {
        setLoading(false);
      }
    },
    [dispatch, onClose],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/pdf': ['.pdf'],
    },
  });

  const handleManualSubmit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const details = {};
      if (manualAmount) details.amount_owed = Number(manualAmount);
      if (manualDueDate) details.due_date = manualDueDate;
      await addUserManual({ name: manualName, details });
      dispatch(fetchUsers());
      dispatch(fetchAnalytics());
      setSuccess('User added successfully');
      setTimeout(() => {
        setManualName('');
        setManualAmount('');
        setManualDueDate('');
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setManualName('');
    setManualAmount('');
    setManualDueDate('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Users</DialogTitle>
          <DialogDescription>
            Upload CSV/Excel file or add user manually
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-500 text-green-600">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* File Upload Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Upload CSV/Excel File
            </h3>
            <p className="text-xs text-muted-foreground">
              CSV format: Username, Service, Bill, DueDate, Installment1, Installment1Date, ...
            </p>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'}
              `}
            >
              <input {...getInputProps()} />
              <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              {isDragActive ? (
                <p className="text-primary font-medium">Drop the file here...</p>
              ) : (
                <div>
                  <p className="font-medium mb-1">
                    Drag and drop CSV/Excel/PDF file here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                OR
              </span>
            </div>
          </div>

          {/* Manual Entry Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium leading-none">
              Add User Manually
            </h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  disabled={loading}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount Owed</Label>
                <Input
                  id="amount"
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  disabled={loading}
                  placeholder="1000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date (YYYY-MM-DD)</Label>
                <Input
                  id="dueDate"
                  value={manualDueDate}
                  onChange={(e) => setManualDueDate(e.target.value)}
                  disabled={loading}
                  placeholder="2025-06-12"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleManualSubmit}
            disabled={!manualName || loading}
          >
            {loading ? 'Adding...' : 'Add User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
