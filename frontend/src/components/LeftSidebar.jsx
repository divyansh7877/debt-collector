import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  List,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import AnalyticsCard from './AnalyticsCard.jsx';
import UserListItem from './UserListItem.jsx';
import { selectEntity, updateStatus } from '../features/users/usersSlice.js';

const STATUSES = ['pending', 'ongoing', 'finished'];

const LeftSidebar = ({ search }) => {
  const dispatch = useDispatch();
  const { users, groups, selectedId, selectedType } = useSelector((state) => state.users);

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes((search || '').toLowerCase()),
  );

  const usersByStatus = STATUSES.reduce((acc, status) => {
    acc[status] = filteredUsers.filter((u) => u.status === status);
    return acc;
  }, {});

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    const userId = parseInt(draggableId.replace('user-', ''), 10);
    const newStatus = destination.droppableId;
    if (!STATUSES.includes(newStatus)) return;
    dispatch(updateStatus({ id: userId, status: newStatus }));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1 }}>
      <AnalyticsCard />
      <DragDropContext onDragEnd={onDragEnd}>
        {STATUSES.map((status) => (
          <Accordion key={status} defaultExpanded sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ textTransform: 'capitalize' }}>{status}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Droppable droppableId={status}>
                {(provided) => (
                  <List
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    dense
                    sx={{ minHeight: 40 }}
                  >
                    {usersByStatus[status].map((u, index) => (
                      <Draggable
                        key={u.id}
                        draggableId={`user-${u.id}`}
                        index={index}
                      >
                        {(dragProvided) => (
                          <Box
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <UserListItem
                              entity={u}
                              selected={selectedId === u.id && selectedType === 'user'}
                              onClick={() =>
                                dispatch(
                                  selectEntity({ id: u.id, type: 'user' }),
                                )
                              }
                            />
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </List>
                )}
              </Droppable>
            </AccordionDetails>
          </Accordion>
        ))}
      </DragDropContext>
    </Box>
  );
};

export default LeftSidebar;
