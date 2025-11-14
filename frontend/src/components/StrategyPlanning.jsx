import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import BlockCard from './BlockCard.jsx';
import PromptDialog from './PromptDialog.jsx';
import {
  aiGenerate,
  execute as executeThunk,
  updateStrategy as updateStrategyThunk,
} from '../features/strategies/strategiesSlice.js';
import { fetchUsers, fetchAnalytics } from '../features/users/usersSlice.js';

const DEFAULT_COLUMNS = ['Day 1-7', 'Day 8-14', 'Day 15-30'];

const StrategyPlanning = () => {
  const dispatch = useDispatch();
  const { selectedId, selectedType } = useSelector((state) => state.users);
  const strategyState = useSelector((state) => state.strategies.strategies);

  const [timeline, setTimeline] = useState([]);
  const [prompt, setPrompt] = useState('Create balanced collection strategy');
  const [promptOpen, setPromptOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null); // { colIndex, blockIndex }

  const currentStrategy = strategyState[selectedId];

  useEffect(() => {
    if (currentStrategy) {
      setTimeline(currentStrategy.timeline || []);
      setPrompt(currentStrategy.prompt || 'Create balanced collection strategy');
    } else {
      // Initialize with empty columns
      setTimeline(DEFAULT_COLUMNS.map((timing) => ({ timing, blocks: [] })));
      setPrompt('Create balanced collection strategy');
    }
    setSelectedBlock(null);
    setDrawerOpen(false);
  }, [currentStrategy, selectedId]);

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

    const newTimeline = timeline.map((col) => ({ ...col, blocks: [...col.blocks] }));
    const [moved] = newTimeline[sourceColIndex].blocks.splice(source.index, 1);
    newTimeline[destColIndex].blocks.splice(destination.index, 0, moved);
    setTimeline(newTimeline);
  };

  const handleBlockClick = (colIndex, blockIndex) => {
    setSelectedBlock({ colIndex, blockIndex });
    setDrawerOpen(true);
  };

  const handleBlockChange = (field, value) => {
    if (!selectedBlock) return;
    const { colIndex, blockIndex } = selectedBlock;
    const newTimeline = timeline.map((col) => ({ ...col, blocks: [...col.blocks] }));
    newTimeline[colIndex].blocks[blockIndex] = {
      ...newTimeline[colIndex].blocks[blockIndex],
      [field]: value,
    };
    setTimeline(newTimeline);
  };

  const handleAddBlock = (colIndex) => {
    const newTimeline = timeline.map((col) => ({ ...col, blocks: [...col.blocks] }));
    newTimeline[colIndex].blocks.push({
      source: 'email',
      tone: 'friendly',
      content: 'New reminder',
    });
    setTimeline(newTimeline);
  };

  const handleSave = () => {
    dispatch(
      updateStrategyThunk({
        userId: selectedId,
        timeline,
        prompt,
      }),
    );
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
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button variant="outlined" onClick={openPromptDialog}>
          AI Generate
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Save Strategy
        </Button>
        <Button variant="contained" color="success" onClick={handleExecute}>
          Execute
        </Button>
      </Box>

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
                    background:
                      'linear-gradient(to bottom, rgba(76, 175, 80, 0.1), rgba(244, 67, 54, 0.1))',
                    borderRadius: 2,
                    p: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2">{col.timing}</Typography>
                    <Button size="small" onClick={() => handleAddBlock(colIndex)}>
                      + Block
                    </Button>
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
                            <BlockCard
                              block={block}
                              onClick={() => handleBlockClick(colIndex, index)}
                            />
                          </Box>
                        )}
                      </Draggable>
                    ))}
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
        PaperProps={{ sx: { width: 320, p: 2 } }}
      >
        {selectedBlock ? (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Edit Block
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Source</InputLabel>
              <Select
                label="Source"
                value={
                  timeline[selectedBlock.colIndex].blocks[selectedBlock.blockIndex]
                    .source
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
                    .tone
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
                  .content
              }
              onChange={(e) => handleBlockChange('content', e.target.value)}
            />
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
