import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Typography variant="h6">Add Users</Typography>
        <Typography variant="caption" color="text.secondary">
          Upload CSV/Excel file or add user manually
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          {/* File Upload Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Upload CSV/Excel File
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              CSV format: Username, Service, Bill, DueDate, Installment1, Installment1Date, ...
            </Typography>
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              {isDragActive ? (
                <Typography color="primary">Drop the file here...</Typography>
              ) : (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    Drag and drop CSV/Excel/PDF file here
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    or click to browse
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Divider>OR</Divider>

          {/* Manual Entry Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Add User Manually
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Name"
                fullWidth
                required
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                disabled={loading}
              />
              <TextField
                label="Amount Owed"
                fullWidth
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                disabled={loading}
              />
              <TextField
                label="Due Date (YYYY-MM-DD)"
                fullWidth
                placeholder="2025-06-12"
                value={manualDueDate}
                onChange={(e) => setManualDueDate(e.target.value)}
                disabled={loading}
              />
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleManualSubmit}
          disabled={!manualName || loading}
          variant="contained"
        >
          {loading ? 'Adding...' : 'Add User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadModal;
