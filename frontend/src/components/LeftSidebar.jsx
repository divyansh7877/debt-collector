import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import AnalyticsCard from './AnalyticsCard.jsx';
import UserListItem from './UserListItem.jsx';
import { selectEntity, updateStatus } from '../features/users/usersSlice.js';

const STATUSES = ['pending', 'ongoing', 'finished', 'archived'];

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
    <div className="h-full flex flex-col p-2 space-y-2 overflow-y-auto">
      <AnalyticsCard />
      <DragDropContext onDragEnd={onDragEnd}>
        <Accordion type="multiple" defaultValue={STATUSES} className="w-full">
          {STATUSES.map((status) => (
            <AccordionItem value={status} key={status}>
              <AccordionTrigger className="capitalize">{status}</AccordionTrigger>
              <AccordionContent>
                <Droppable droppableId={status}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="min-h-[40px] space-y-1"
                    >
                      {usersByStatus[status].map((u, index) => (
                        <Draggable
                          key={u.id}
                          draggableId={`user-${u.id}`}
                          index={index}
                        >
                          {(dragProvided) => (
                            <div
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
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DragDropContext>
    </div>
  );
};

export default LeftSidebar;
