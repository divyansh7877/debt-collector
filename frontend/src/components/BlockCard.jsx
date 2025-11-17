import React from 'react';
import { Card, CardContent, Chip, Stack, Typography, Box } from '@mui/material';
import { Email, Phone, Sms, Star } from '@mui/icons-material';

const BlockCard = ({ block, onClick }) => {
  const getSourceIcon = (source) => {
    switch (source?.toLowerCase()) {
      case 'email':
        return <Email fontSize="small" />;
      case 'phone':
      case 'call':
        return <Phone fontSize="small" />;
      case 'sms':
        return <Sms fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{ mb: 1, cursor: 'pointer' }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Chip
            size="small"
            icon={getSourceIcon(block.source)}
            label={block.source}
          />
          <Chip size="small" label={block.tone} color="primary" />
          {block.preferred_contact && (
            <Chip
              size="small"
              icon={<Star />}
              label="Preferred"
              color="warning"
              variant="outlined"
            />
          )}
        </Stack>
        <Typography 
          variant="body2" 
          sx={{ 
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {block.content}
        </Typography>
        {block.contact_method_detail && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Via: {block.contact_method_detail}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default BlockCard;
