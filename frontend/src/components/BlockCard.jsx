import React from 'react';
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, MessageSquare, Star } from 'lucide-react';

const BlockCard = ({ block, onClick }) => {
  const getSourceIcon = (source) => {
    switch (source?.toLowerCase()) {
      case 'email':
        return <Mail className="h-3 w-3" />;
      case 'phone':
      case 'call':
        return <Phone className="h-3 w-3" />;
      case 'sms':
        return <MessageSquare className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card
      className="mb-2 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="gap-1">
            {getSourceIcon(block.source)}
            {block.source}
          </Badge>
          <Badge>{block.tone}</Badge>
          {block.preferred_contact && (
            <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
              <Star className="h-3 w-3" />
              Preferred
            </Badge>
          )}
        </div>
        <p className="text-sm line-clamp-3 break-words">
          {block.content}
        </p>
        {block.contact_method_detail && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              Via: {block.contact_method_detail}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BlockCard;
