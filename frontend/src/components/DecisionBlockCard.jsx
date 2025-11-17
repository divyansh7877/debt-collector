import React from 'react';
import { Card, CardContent, Chip, Stack, Typography, Box } from '@mui/material';
import { AccountTree, Psychology } from '@mui/icons-material';

const DecisionBlockCard = ({ block, onClick }) => {
  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1,
        cursor: 'pointer',
        background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(103, 58, 183, 0.1) 100%)',
        borderColor: 'secondary.main',
        borderWidth: 2,
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Psychology color="secondary" fontSize="small" />
          <Chip size="small" label="AI Decision" color="secondary" />
          {block.decision_sources && block.decision_sources.length > 0 && (
            <Chip
              size="small"
              icon={<AccountTree />}
              label={`${block.decision_sources.length} sources`}
              variant="outlined"
            />
          )}
        </Stack>
        <Typography 
          variant="body2" 
          sx={{ 
            fontStyle: 'italic', 
            mb: 0.5,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {block.decision_prompt || 'Decision point'}
        </Typography>
        {block.decision_outputs && block.decision_outputs.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {block.decision_outputs.length} possible outcome{block.decision_outputs.length > 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DecisionBlockCard;
