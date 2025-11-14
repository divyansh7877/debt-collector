import React from 'react';
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';

const BlockCard = ({ block, onClick }) => {
  return (
    <Card
      variant="outlined"
      sx={{ mb: 1, cursor: 'pointer' }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Chip size="small" label={block.source} />
          <Chip size="small" label={block.tone} color="primary" />
        </Stack>
        <Typography variant="body2" noWrap>
          {block.content}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BlockCard;
