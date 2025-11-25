import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import BlockCard from './BlockCard.jsx';
import DecisionBlockCard from './DecisionBlockCard.jsx';
import PromptDialog from './PromptDialog.jsx';
import {
  aiGenerate,
  execute as executeThunk,
  updateStrategy as updateStrategyThunk,
} from '../features/strategies/strategiesSlice.js';
import { fetchUsers, fetchAnalytics } from '../features/users/usersSlice.js';
import { getUser, aiGenerateBlockContent } from '../api/services.js';
import { Trash2, AlertTriangle, Plus } from 'lucide-react';

const DEFAULT_COLUMNS = ['Day 1-7', 'Day 8-14', 'Day 15-30', 'Day 31-50', 'Day 51-90', 'Day 90+'];

// Colors gradient from green to red as urgency increases
const COLUMN_COLORS = [
  'bg-green-50/50',   // Green - Day 1-7
  'bg-lime-50/50',  // Light Green - Day 8-14
  'bg-yellow-50/50',  // Yellow - Day 15-30
  'bg-orange-50/50',   // Orange - Day 31-50
  'bg-red-50/50',   // Deep Orange - Day 51-90
  'bg-rose-50/50',   // Red - Day 90+
];

const COLUMN_BORDERS = [
  'border-green-200',
  'border-lime-200',
  'border-yellow-200',
  'border-orange-200',
  'border-red-200',
  'border-rose-200',
];

const normalizeTimeline = (timeline = []) =>
  timeline.map((col) => ({
    timing: col.timing,
    blocks: (col.blocks || []).map((block) => ({
      block_type: block.block_type || 'action',
      ...block,
    })),
  }));

const createEmptyTimeline = () => DEFAULT_COLUMNS.map((timing) => ({ timing, blocks: [] }));

const StrategyPlanning = () => {
  const dispatch = useDispatch();
  const { selectedId, selectedType } = useSelector((state) => state.users);
  const strategyState = useSelector((state) => state.strategies.strategies);

  const [timeline, setTimeline] = useState([]);
  const [prompt, setPrompt] = useState('Create balanced collection strategy');
  const [promptOpen, setPromptOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null); // { colIndex, blockIndex }
  const [userDetails, setUserDetails] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [blockAIPrompt, setBlockAIPrompt] = useState('');
  const [blockAIGenerating, setBlockAIGenerating] = useState(false);
  const [blockAIError, setBlockAIError] = useState(null);

  const currentStrategy = strategyState[selectedId];

  const initialTimeline = useMemo(() => {
    if (currentStrategy && currentStrategy.timeline) {
      return normalizeTimeline(currentStrategy.timeline || []);
    }
    return createEmptyTimeline();
  }, [currentStrategy, selectedId]);

  const initialPromptValue = useMemo(
    () => currentStrategy?.prompt || 'Create balanced collection strategy',
    [currentStrategy, selectedId],
  );

  useEffect(() => {
    setTimeline(initialTimeline);
    setPrompt(initialPromptValue);
    setSelectedBlock(null);
    setDrawerOpen(false);
    setBlockAIPrompt('');
    setBlockAIError(null);
    setValidationError(null);
  }, [initialTimeline, initialPromptValue, selectedId]);

  // Fetch user details for contact methods
  useEffect(() => {
    if (!selectedId) {
      setUserDetails(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getUser(selectedId);
        if (!cancelled) {
          const details = res.data?.data?.details || {};
          // Ensure contact_methods is an array
          if (details.contact_methods && !Array.isArray(details.contact_methods)) {
            details.contact_methods = [];
          }
          setUserDetails(details);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch user details', err);
          setUserDetails({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const hasUnsavedChanges = useMemo(() => {
    const timelinesEqual =
      JSON.stringify(timeline) === JSON.stringify(initialTimeline);
    return !(timelinesEqual && prompt === initialPromptValue);
  }, [timeline, initialTimeline, prompt, initialPromptValue]);

  if (!selectedId || selectedType !== 'user') {
    return (
      <div className="p-4 text-muted-foreground">Select a user to plan strategy.</div>
    );
  }

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceColIndex = parseInt(source.droppableId.replace('col-', ''), 10);
    const destColIndex = parseInt(destination.droppableId.replace('col-', ''), 10);

    setTimeline((prev) => {
      const newTimeline = prev.map((col) => ({ ...col, blocks: [...col.blocks] }));
      const [moved] = newTimeline[sourceColIndex].blocks.splice(source.index, 1);
      newTimeline[destColIndex].blocks.splice(destination.index, 0, moved);
      return newTimeline;
    });
  };

  const handleBlockClick = (colIndex, blockIndex) => {
    setSelectedBlock({ colIndex, blockIndex });
    setDrawerOpen(true);
    setBlockAIPrompt('');
    setBlockAIError(null);
  };

  const handleBlockChange = (field, value) => {
    if (!selectedBlock) return;
    const { colIndex, blockIndex } = selectedBlock;
    setTimeline((prev) => {
      const newTimeline = prev.map((col) => ({ ...col, blocks: [...col.blocks] }));
      newTimeline[colIndex].blocks[blockIndex] = {
        ...newTimeline[colIndex].blocks[blockIndex],
        [field]: value,
      };
      return newTimeline;
    });
    setValidationError(null);
  };

  const handleAddBlock = (colIndex, blockType = 'action') => {
    let newBlockIndex = 0;
    setTimeline((prev) => {
      const newTimeline = prev.map((col) => ({ ...col, blocks: [...col.blocks] }));
      if (blockType === 'decision') {
        newTimeline[colIndex].blocks.push({
          block_type: 'decision',
          decision_prompt: 'Enter decision logic',
          decision_sources: [],
          decision_outputs: [],
        });
      } else {
        // For action blocks, auto-populate preferred contact if available
        const newBlock = {
          block_type: 'action',
          source: 'email',
          tone: 'friendly',
          content: 'New reminder',
        };

        // Auto-populate preferred contact method detail if available
        if (userDetails?.contact_methods && Array.isArray(userDetails.contact_methods)) {
          const preferredMethod = userDetails.contact_methods.find((cm) => cm.is_preferred);
          if (preferredMethod) {
            newBlock.contact_method_detail = preferredMethod.value;
            // Also set source based on preferred method type
            if (preferredMethod.method === 'email') {
              newBlock.source = 'email';
            } else if (preferredMethod.method === 'phone') {
              newBlock.source = 'call';
            }
          }
        }

        // Set preferred contact type
        if (userDetails?.preferred_contact) {
          newBlock.preferred_contact = userDetails.preferred_contact;
        }

        newTimeline[colIndex].blocks.push(newBlock);
      }
      newBlockIndex = newTimeline[colIndex].blocks.length - 1;
      return newTimeline;
    });
    setValidationError(null);
    // Open drawer to edit the new block
    setSelectedBlock({ colIndex, blockIndex: newBlockIndex });
    setDrawerOpen(true);
  };

  const handleAddDecisionOutput = () => {
    if (!selectedBlock) return;
    const { colIndex, blockIndex } = selectedBlock;
    setTimeline((prev) => {
      const newTimeline = prev.map((col) => ({ ...col, blocks: [...col.blocks] }));
      const block = { ...newTimeline[colIndex].blocks[blockIndex] };
      const outputs = block.decision_outputs ? [...block.decision_outputs] : [];
      const defaultTiming = newTimeline[colIndex]?.timing || DEFAULT_COLUMNS[0];
      outputs.push({
        condition: '',
        next_timing: defaultTiming,
        action: '',
      });
      block.decision_outputs = outputs;
      newTimeline[colIndex].blocks[blockIndex] = block;
      return newTimeline;
    });
    setValidationError(null);
  };

  const handleResetChanges = () => {
    setTimeline(initialTimeline);
    setPrompt(initialPromptValue);
    setSelectedBlock(null);
    setDrawerOpen(false);
    setValidationError(null);
  };

  const handleDecisionOutputChange = (outputIndex, field, value) => {
    if (!selectedBlock) return;
    const { colIndex, blockIndex } = selectedBlock;
    setTimeline((prev) => {
      const newTimeline = prev.map((col) => ({ ...col, blocks: [...col.blocks] }));
      const block = { ...newTimeline[colIndex].blocks[blockIndex] };
      const outputs = block.decision_outputs ? [...block.decision_outputs] : [];
      outputs[outputIndex] = {
        ...outputs[outputIndex],
        [field]: value,
      };
      block.decision_outputs = outputs;
      newTimeline[colIndex].blocks[blockIndex] = block;
      return newTimeline;
    });
    setValidationError(null);
  };

  const handleRemoveDecisionOutput = (outputIndex) => {
    if (!selectedBlock) return;
    const { colIndex, blockIndex } = selectedBlock;
    setTimeline((prev) => {
      const newTimeline = prev.map((col) => ({ ...col, blocks: [...col.blocks] }));
      const block = { ...newTimeline[colIndex].blocks[blockIndex] };
      const outputs = block.decision_outputs ? [...block.decision_outputs] : [];
      outputs.splice(outputIndex, 1);
      block.decision_outputs = outputs;
      newTimeline[colIndex].blocks[blockIndex] = block;
      return newTimeline;
    });
    setValidationError(null);
  };

  const handleRemoveBlock = () => {
    if (!selectedBlock) return;
    const { colIndex, blockIndex } = selectedBlock;
    setTimeline((prev) => {
      const newTimeline = prev.map((col) => ({ ...col, blocks: [...col.blocks] }));
      newTimeline[colIndex].blocks.splice(blockIndex, 1);
      return newTimeline;
    });
    setSelectedBlock(null);
    setDrawerOpen(false);
    setBlockAIPrompt('');
    setBlockAIError(null);
    setValidationError(null);
  };

  const validateTimeline = (tl) => {
    for (const col of tl) {
      for (const block of col.blocks) {
        const type = block.block_type || 'action';
        if (type === 'decision') {
          if (!block.decision_prompt || !block.decision_prompt.trim()) {
            return `Decision block in ${col.timing} needs a prompt.`;
          }
          const outputs = block.decision_outputs || [];
          if (!outputs.length) {
            return `Decision block in ${col.timing} needs at least one outcome.`;
          }
          for (const output of outputs) {
            if (!output?.condition || !output.condition.trim()) {
              return 'All decision outcomes need a condition.';
            }
            if (!output?.next_timing || !output.next_timing.trim()) {
              return 'All decision outcomes need a next timing.';
            }
          }
        } else {
          if (!block.source || !block.source.trim()) {
            return `Action block in ${col.timing} needs a source.`;
          }
          if (!block.tone || !block.tone.trim()) {
            return `Action block in ${col.timing} needs a tone.`;
          }
          if (!block.content || !block.content.trim()) {
            return `Action block in ${col.timing} needs content.`;
          }
        }
      }
    }
    return null;
  };

  const handleSave = () => {
    const error = validateTimeline(timeline);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    dispatch(
      updateStrategyThunk({
        userId: selectedId,
        timeline,
        prompt,
      }),
    );
  };

  const handleGenerateBlockContent = async () => {
    if (!selectedBlock) return;
    const { colIndex, blockIndex } = selectedBlock;
    const block =
      timeline[colIndex]?.blocks?.[blockIndex];
    if (!block || (block.block_type || 'action') !== 'action') {
      return;
    }
    try {
      setBlockAIGenerating(true);
      setBlockAIError(null);
      const res = await aiGenerateBlockContent(selectedId, block, blockAIPrompt);
      const content = res?.data?.content;
      if (content) {
        handleBlockChange('content', content);
      }
    } catch (err) {
      console.error('Failed to generate block content with AI', err);
      setBlockAIError('Failed to generate content. Please try again.');
    } finally {
      setBlockAIGenerating(false);
    }
  };

  const handleExecute = async () => {
    await dispatch(executeThunk(selectedId));
    // Refresh users & analytics to reflect status change
    dispatch(fetchUsers());
    dispatch(fetchAnalytics());
  };

  const openPromptDialog = () => {
    setPromptOpen(true);
  };

  const handlePromptSubmit = async (p) => {
    setPromptOpen(false);
    setPrompt(p);
    await dispatch(aiGenerate({ userId: selectedId, prompt: p }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-stretch sm:items-center">
        <Button variant="outline" onClick={openPromptDialog}>
          AI Generate
        </Button>
        <Button onClick={handleSave}>
          Save Strategy
        </Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleExecute}>
          Execute
        </Button>
        <Button variant="ghost" onClick={handleResetChanges} disabled={!hasUnsavedChanges}>
          Reset Changes
        </Button>
        <span className={`text-xs ${hasUnsavedChanges ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}`}>
          {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
        </span>
      </div>
      {validationError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto overflow-y-hidden flex-1 min-w-0 pb-2">
          {timeline.map((col, colIndex) => (
            <Droppable droppableId={`col-${colIndex}`} key={colIndex}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`
                    min-w-[280px] w-[280px] flex-shrink-0
                    border rounded-lg p-2 flex flex-col overflow-hidden
                    ${COLUMN_COLORS[colIndex] || COLUMN_COLORS[COLUMN_COLORS.length - 1]}
                    ${COLUMN_BORDERS[colIndex] || COLUMN_BORDERS[COLUMN_BORDERS.length - 1]}
                  `}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold">{col.timing}</h4>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleAddBlock(colIndex, 'action')}>
                        + Action
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50" onClick={() => handleAddBlock(colIndex, 'decision')}>
                        + Decision
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[50px] overflow-y-auto overflow-x-hidden space-y-2">
                    {col.blocks.map((block, index) => (
                      <Draggable
                        key={`${colIndex}-${index}`}
                        draggableId={`${colIndex}-${index}`}
                        index={index}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            {block.block_type === 'decision' ? (
                              <DecisionBlockCard
                                block={block}
                                onClick={() => handleBlockClick(colIndex, index)}
                              />
                            ) : (
                              <BlockCard
                                block={block}
                                onClick={() => handleBlockClick(colIndex, index)}
                              />
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {col.blocks.length === 0 && (
                      <div className="border border-dashed border-muted-foreground/30 rounded p-4 text-center text-xs text-muted-foreground">
                        Drop actions or add a new one to get started.
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedBlock && timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex].block_type === 'decision'
                ? 'Edit Decision Block'
                : 'Edit Action Block'}
            </SheetTitle>
            <SheetDescription>
              Configure the details for this step in the strategy.
            </SheetDescription>
          </SheetHeader>

          <div className="py-6">
            {selectedBlock ? (
              <div className="space-y-6">
                {timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex].block_type === 'decision' ? (
                  // Decision Block Editor
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Decision Prompt</Label>
                      <Textarea
                        placeholder="Describe the decision logic or condition to evaluate"
                        value={
                          timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                            .decision_prompt || ''
                        }
                        onChange={(e) => handleBlockChange('decision_prompt', e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Sources (comma-separated)</Label>
                      <Input
                        placeholder="e.g., payment_history, communication_log"
                        value={
                          (timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                            .decision_sources || []).join(', ')
                        }
                        onChange={(e) =>
                          handleBlockChange(
                            'decision_sources',
                            e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          )
                        }
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Outputs/Conditions</Label>
                      <p className="text-xs text-muted-foreground">Define possible outcomes based on the decision</p>

                      <div className="space-y-3">
                        {(timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex].decision_outputs ||
                          []).map((output, idx) => (
                            <div key={idx} className="border rounded-md p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Outcome {idx + 1}</span>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleRemoveDecisionOutput(idx)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Condition</Label>
                                <Input
                                  value={output?.condition || ''}
                                  onChange={(e) => handleDecisionOutputChange(idx, 'condition', e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Next Timing</Label>
                                <Select
                                  value={output?.next_timing || ''}
                                  onValueChange={(value) => handleDecisionOutputChange(idx, 'next_timing', value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select timing" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeline.map((col) => (
                                      <SelectItem key={col.timing} value={col.timing}>
                                        {col.timing}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Action (Optional)</Label>
                                <Input
                                  value={output?.action || ''}
                                  onChange={(e) => handleDecisionOutputChange(idx, 'action', e.target.value)}
                                  className="h-8"
                                  placeholder="Describe action"
                                />
                              </div>
                            </div>
                          ))}
                        <Button variant="outline" size="sm" className="w-full" onClick={handleAddDecisionOutput}>
                          <Plus className="mr-2 h-4 w-4" /> Add Outcome
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Action Block Editor
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Select
                        value={
                          timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                            .source || ''
                        }
                        onValueChange={(value) => handleBlockChange('source', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="call">Call</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select
                        value={
                          timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                            .tone || ''
                        }
                        onValueChange={(value) => handleBlockChange('tone', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="firm">Firm</SelectItem>
                          <SelectItem value="escalation">Escalation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        value={
                          timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                            .content || ''
                        }
                        onChange={(e) => handleBlockChange('content', e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="border border-dashed rounded-md p-3 space-y-3 bg-muted/50">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">AI Assist (Optional)</Label>
                        <p className="text-xs text-muted-foreground">Type your own content above or use AI to generate a starting point.</p>
                      </div>
                      <Textarea
                        placeholder="e.g. Emphasize a friendly reminder with a flexible payment plan"
                        value={blockAIPrompt}
                        onChange={(e) => setBlockAIPrompt(e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleGenerateBlockContent}
                          disabled={blockAIGenerating}
                        >
                          {blockAIGenerating ? 'Generating...' : 'Generate with AI'}
                        </Button>
                        {blockAIError && (
                          <span className="text-xs text-destructive">{blockAIError}</span>
                        )}
                      </div>
                    </div>

                    {userDetails?.contact_methods && Array.isArray(userDetails.contact_methods) && userDetails.contact_methods.length > 0 && (
                      <div className="space-y-2">
                        <Label>Contact Method</Label>
                        <Select
                          value={
                            timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                              .contact_method_detail || ''
                          }
                          onValueChange={(value) => handleBlockChange('contact_method_detail', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select contact method" />
                          </SelectTrigger>
                          <SelectContent>
                            {userDetails.contact_methods.map((cm, idx) => (
                              <SelectItem key={idx} value={cm.value}>
                                {cm.label || `${cm.method.charAt(0).toUpperCase() + cm.method.slice(1)} ${idx + 1}`}: {cm.value} {cm.is_preferred ? '⭐' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Preferred Contact Type</Label>
                      <Select
                        value={
                          timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                            .preferred_contact || userDetails?.preferred_contact || ''
                        }
                        onValueChange={(value) => handleBlockChange('preferred_contact', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preferred type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      {userDetails?.preferred_contact && (
                        <p className="text-xs text-muted-foreground">
                          User's preferred: {userDetails.preferred_contact}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleRemoveBlock}
                  disabled={!selectedBlock}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Block
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">Select a block to edit</div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <PromptDialog
        open={promptOpen}
        initialPrompt={prompt}
        onClose={() => setPromptOpen(false)}
        onSubmit={handlePromptSubmit}
      />
    </div>
  );
};

export default StrategyPlanning;
