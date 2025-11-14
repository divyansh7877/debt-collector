import React from 'react';
import { Chip, ListItem, ListItemButton, ListItemText } from '@mui/material';

const statusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'default';
    case 'ongoing':
      return 'primary';
    case 'finished':
      return 'success';
    default:
      return 'default';
  }
};

const UserListItem = ({ entity, selected, onClick }) => {
  const secondary = entity.summary_details?.amount_owed
    ? `Owes ${entity.summary_details.amount_owed}`
    : entity.summary_details?.members
    ? `${entity.summary_details.members} members`
    : '';

  return (
    <ListItem disablePadding>
      <ListItemButton selected={selected} onClick={onClick}>
        <ListItemText primary={entity.name} secondary={secondary} />
        <Chip size="small" label={entity.status} color={statusColor(entity.status)} />
      </ListItemButton>
    </ListItem>
  );
};

export default UserListItem;
