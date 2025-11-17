import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
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
import { Delete } from '@mui/icons-material';

const DEFAULT_COLUMNS = ['Day 1-7', 'Day 8-14', 'Day 15-30', 'Day 31-50', 'Day 51-90', 'Day 90+'];

// Colors gradient from green to red as urgency increases
const COLUMN_COLORS = [
  'rgba(76, 175, 80, 0.15)',   // Green - Day 1-7
  'rgba(139, 195, 74, 0.15)',  // Light Green - Day 8-14
  'rgba(255, 235, 59, 0.15)',  // Yellow - Day 15-30
  'rgba(255, 152, 0, 0.15)',   // Orange - Day 31-50
  'rgba(255, 87, 34, 0.15)',   // Deep Orange - Day 51-90
  'rgba(244, 67, 54, 0.15)',   // Red - Day 90+
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
      <Typography>Select a user to plan strategy.</Typography>
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
    <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ mb: 2, alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <Button variant="outlined" onClick={openPromptDialog}>
          AI Generate
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Save Strategy
        </Button>
        <Button variant="contained" color="success" onClick={handleExecute}>
          Execute
        </Button>
        <Button variant="text" onClick={handleResetChanges} disabled={!hasUnsavedChanges}>
          Reset Changes
        </Button>
        <Typography
          variant="caption"
          color={hasUnsavedChanges ? 'warning.main' : 'text.secondary'}
        >
          {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
        </Typography>
      </Stack>
      {validationError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', flex: 1 }}>
          {timeline.map((col, colIndex) => (
            <Droppable droppableId={`col-${colIndex}`} key={colIndex}>
              {(provided) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    minWidth: 260,
                    backgroundColor: COLUMN_COLORS[colIndex] || COLUMN_COLORS[COLUMN_COLORS.length - 1],
                    border: '1px solid',
                    borderColor: colIndex < 2 ? 'success.light' : colIndex < 4 ? 'warning.light' : 'error.light',
                    borderRadius: 2,
                    p: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2">{col.timing}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" onClick={() => handleAddBlock(colIndex, 'action')}>
                        + Action
                      </Button>
                      <Button size="small" color="secondary" onClick={() => handleAddBlock(colIndex, 'decision')}>
                        + Decision
                      </Button>
                    </Stack>
                  </Box>
                  <Box sx={{ flex: 1, minHeight: 50 }}>
                    {col.blocks.map((block, index) => (
                      <Draggable
                        key={`${colIndex}-${index}`}
                        draggableId={`${colIndex}-${index}`}
                        index={index}
                      >
                        {(dragProvided) => (
                          <Box
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
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {col.blocks.length === 0 && (
                      <Box
                        sx={{
                          border: '1px dashed',
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 1,
                          textAlign: 'center',
                          color: 'text.secondary',
                          fontSize: 12,
                        }}
                      >
                        Drop actions or add a new one to get started.
                      </Box>
                    )}
                    {provided.placeholder}
                  </Box>
                </Box>
              )}
            </Droppable>
          ))}
        </Box>
      </DragDropContext>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 400, p: 2 } }}
      >
        {selectedBlock ? (
          <Box>
            {timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex].block_type === 'decision' ? (
              // Decision Block Editor
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Edit Decision Block
                </Typography>
                <TextField
                  label="Decision Prompt"
                  multiline
                  minRows={3}
                  fullWidth
                  sx={{ mb: 2 }}
                  value={
                    timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                      .decision_prompt || ''
                  }
                  onChange={(e) => handleBlockChange('decision_prompt', e.target.value)}
                  helperText="Describe the decision logic or condition to evaluate"
                />
                <TextField
                  label="Data Sources (comma-separated)"
                  fullWidth
                  sx={{ mb: 2 }}
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
                  helperText="e.g., payment_history, communication_log"
                />
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Outputs/Conditions:
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Define possible outcomes based on the decision
                </Typography>
                <Stack spacing={2}>
                  {(timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex].decision_outputs ||
                    []).map((output, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1,
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          Outcome {idx + 1}
                        </Typography>
                        <IconButton color="error" size="small" onClick={() => handleRemoveDecisionOutput(idx)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                      <TextField
                        label="Condition"
                        fullWidth
                        sx={{ mt: 1 }}
                        value={output?.condition || ''}
                        onChange={(e) => handleDecisionOutputChange(idx, 'condition', e.target.value)}
                      />
                      <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel>Next Timing</InputLabel>
                        <Select
                          label="Next Timing"
                          value={output?.next_timing || ''}
                          onChange={(e) => handleDecisionOutputChange(idx, 'next_timing', e.target.value)}
                        >
                          {timeline.map((col) => (
                            <MenuItem key={col.timing} value={col.timing}>
                              {col.timing}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Action"
                        fullWidth
                        sx={{ mt: 1 }}
                        value={output?.action || ''}
                        onChange={(e) => handleDecisionOutputChange(idx, 'action', e.target.value)}
                        helperText="Optional: describe the action once this path is taken"
                      />
                    </Box>
                  ))}
                  <Button variant="outlined" onClick={handleAddDecisionOutput}>
                    + Add Outcome
                  </Button>
                </Stack>
              </Box>
            ) : (
              // Action Block Editor
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Edit Action Block
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Source</InputLabel>
                  <Select
                    label="Source"
                    value={
                      timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                        .source || ''
                    }
                    onChange={(e) => handleBlockChange('source', e.target.value)}
                  >
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                    <MenuItem value="call">Call</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Tone</InputLabel>
                  <Select
                    label="Tone"
                    value={
                      timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                        .tone || ''
                    }
                    onChange={(e) => handleBlockChange('tone', e.target.value)}
                  >
                    <MenuItem value="friendly">Friendly</MenuItem>
                    <MenuItem value="neutral">Neutral</MenuItem>
                    <MenuItem value="firm">Firm</MenuItem>
                    <MenuItem value="escalation">Escalation</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Content"
                  multiline
                  minRows={3}
                  fullWidth
                  sx={{ mb: 2 }}
                  value={
                    timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                      .content || ''
                  }
                  onChange={(e) => handleBlockChange('content', e.target.value)}
                />
                <Box
                  sx={{
                    mb: 2,
                    p: 1,
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    AI assist (optional)
                  </Typography>
                  <TextField
                    label="Describe what you want the message to say"
                    fullWidth
                    multiline
                    minRows={2}
                    sx={{ mb: 1 }}
                    value={blockAIPrompt}
                    onChange={(e) => setBlockAIPrompt(e.target.value)}
                    placeholder="e.g. Emphasize a friendly reminder with a flexible payment plan"
                  />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleGenerateBlockContent}
                      disabled={blockAIGenerating}
                    >
                      {blockAIGenerating ? 'Generating…' : 'Generate with AI'}
                    </Button>
                    {blockAIError && (
                      <Typography variant="caption" color="error">
                        {blockAIError}
                      </Typography>
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    You can type your own content above or use AI to generate a starting point and edit it.
                  </Typography>
                </Box>
                {userDetails?.contact_methods && Array.isArray(userDetails.contact_methods) && userDetails.contact_methods.length > 0 && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Contact Method</InputLabel>
                    <Select
                      label="Contact Method"
                      value={
                        timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                          .contact_method_detail || ''
                      }
                      onChange={(e) => handleBlockChange('contact_method_detail', e.target.value)}
                    >
                      {userDetails.contact_methods.map((cm, idx) => (
                        <MenuItem key={idx} value={cm.value}>
                          {cm.label || `${cm.method.charAt(0).toUpperCase() + cm.method.slice(1)} ${idx + 1}`}: {cm.value} {cm.is_preferred ? '⭐ (Preferred)' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Preferred Contact Type</InputLabel>
                  <Select
                    label="Preferred Contact Type"
                    value={
                      timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                        .preferred_contact || userDetails?.preferred_contact || ''
                    }
                    onChange={(e) => handleBlockChange('preferred_contact', e.target.value)}
                  >
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="phone">Phone</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                  </Select>
                  {userDetails?.preferred_contact && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      User's preferred: {userDetails.preferred_contact}
                    </Typography>
                  )}
                </FormControl>
              </Box>
            )}
            <Divider sx={{ my: 2 }} />
            <Button color="error" onClick={handleRemoveBlock} startIcon={<Delete />} disabled={!selectedBlock}>
              Delete Block
            </Button>
          </Box>
        ) : (
          <Typography>Select a block to edit</Typography>
        )}
      </Drawer>

      <PromptDialog
        open={promptOpen}
        initialPrompt={prompt}
        onClose={() => setPromptOpen(false)}
        onSubmit={handlePromptSubmit}
      />
    </Box>
  );
};

export default StrategyPlanning;
