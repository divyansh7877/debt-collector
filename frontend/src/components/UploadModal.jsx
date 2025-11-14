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
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { uploadFile, addUserManual } from '../api/services.js';
import { fetchUsers, fetchAnalytics } from '../features/users/usersSlice.js';

const UploadModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const [error, setError] = useState(null);
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDueDate, setManualDueDate] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (!acceptedFiles.length) return;
      setError(null);
      try {
        const file = acceptedFiles[0];
        await uploadFile(file);
        dispatch(fetchUsers());
        dispatch(fetchAnalytics());
        onClose();
      } catch (e) {
        console.error(e);
        setError('Failed to upload file');
      }
    },
    [dispatch, onClose],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleManualSubmit = async () => {
    setError(null);
    try {
      const details = {};
      if (manualAmount) details.amount_owed = Number(manualAmount);
      if (manualDueDate) details.due_date = manualDueDate;
      await addUserManual({ name: manualName, details });
      dispatch(fetchUsers());
      dispatch(fetchAnalytics());
      onClose();
    } catch (e) {
      console.error(e);
      setError('Failed to add user');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Upload User Data</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <div
            {...getRootProps()}
            style={{
              border: '2px dashed #ccc',
              padding: 16,
              textAlign: 'center',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <Typography>Drop the Excel/PDF file here ...</Typography>
            ) : (
              <Typography>
                Drag and drop Excel/PDF here, or click to select file
              </Typography>
            )}
          </div>

          <Typography variant="subtitle2">Or add manually</Typography>
          <TextField
            label="Name"
            fullWidth
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
          />
          <TextField
            label="Amount Owed"
            fullWidth
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
          />
          <TextField
            label="Due Date (YYYY-MM-DD)"
            fullWidth
            value={manualDueDate}
            onChange={(e) => setManualDueDate(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={handleManualSubmit} disabled={!manualName} variant="contained">
          Add User
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadModal;
