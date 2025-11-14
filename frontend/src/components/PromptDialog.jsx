import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

const PromptDialog = ({ open, initialPrompt, onClose, onSubmit }) => {
  const [prompt, setPrompt] = useState(initialPrompt);

  const handleSubmit = () => {
    onSubmit(prompt);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>AI Strategy Prompt</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Prompt"
          fullWidth
          multiline
          minRows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromptDialog;
