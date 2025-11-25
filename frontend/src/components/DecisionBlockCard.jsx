import React from 'react';
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitBranch, BrainCircuit } from 'lucide-react';

const DecisionBlockCard = ({ block, onClick }) => {
  return (
    <Card
      className="mb-2 cursor-pointer hover:shadow-md transition-shadow border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <BrainCircuit className="h-4 w-4 text-purple-600" />
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">AI Decision</Badge>
          {block.decision_sources && block.decision_sources.length > 0 && (
            <Badge variant="outline" className="gap-1 border-purple-200">
              <GitBranch className="h-3 w-3" />
              {block.decision_sources.length} sources
            </Badge>
          )}
        </div>
        <p className="text-sm italic mb-2 line-clamp-3 break-words">
          {block.decision_prompt || 'Decision point'}
        </p>
        {block.decision_outputs && block.decision_outputs.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              {block.decision_outputs.length} possible outcome{block.decision_outputs.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DecisionBlockCard;
