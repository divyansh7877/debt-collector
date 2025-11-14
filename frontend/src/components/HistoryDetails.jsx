import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { getUser } from '../api/services.js';

const HistoryDetails = () => {
  const { selectedId } = useSelector((state) => state.users);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!selectedId) {
      setData(null);
      return;
    }
    (async () => {
      try {
        const res = await getUser(selectedId);
        setData(res.data);
      } catch (e) {
        console.error('Failed to fetch entity details', e);
      }
    })();
  }, [selectedId]);

  if (!data) {
    return null;
  }

  const { type, data: entity, group, members } = data;
  const details = entity.details || {};
  const historyText = details.history_text;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {entity.name} ({type})
      </Typography>

      <Accordion defaultExpanded sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Details</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Table size="small">
            <TableBody>
              {Object.entries(details).map(([key, value]) =>
                key === 'history_text' ? null : (
                  <TableRow key={key}>
                    <TableCell sx={{ fontWeight: 500 }}>{key}</TableCell>
                    <TableCell>{String(value)}</TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>

      {historyText && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>History</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ whiteSpace: 'pre-wrap' }}>{historyText}</Box>
          </AccordionDetails>
        </Accordion>
      )}

      {type === 'user' && group && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Group</Typography>
          <Typography>{group.name}</Typography>
        </Box>
      )}

      {type === 'group' && members && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Members</Typography>
          {members.map((m) => (
            <Typography key={m.id}>{m.name}</Typography>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default HistoryDetails;
