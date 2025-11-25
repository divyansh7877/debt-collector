import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusVariant = (status) => {
  switch (status) {
    case 'pending':
      return 'secondary';
    case 'ongoing':
      return 'default';
    case 'finished':
      return 'success'; // We might need to define a success variant or use default/secondary
    case 'archived':
      return 'outline';
    default:
      return 'secondary';
  }
};

// Custom success badge style if not available in default variants
const getBadgeClassName = (status) => {
  if (status === 'finished') return "bg-green-500 hover:bg-green-600 border-transparent text-white";
  return "";
}

const UserListItem = ({ entity, selected, onClick }) => {
  const secondary = entity.summary_details?.amount_owed
    ? `Owes ${entity.summary_details.amount_owed}`
    : entity.summary_details?.members
      ? `${entity.summary_details.members} members`
      : '';

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 cursor-pointer hover:bg-accent transition-colors rounded-md",
        selected && "bg-accent text-accent-foreground"
      )}
      onClick={onClick}
    >
      <div className="flex flex-col">
        <span className="font-medium text-sm">{entity.name}</span>
        {secondary && <span className="text-xs text-muted-foreground">{secondary}</span>}
      </div>
      <Badge variant={statusVariant(entity.status)} className={getBadgeClassName(entity.status)}>
        {entity.status}
      </Badge>
    </div>
  );
};

export default UserListItem;
