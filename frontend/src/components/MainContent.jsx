import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import Dashboard from './Dashboard.jsx';
import HistoryDetails from './HistoryDetails.jsx';
import StrategyPlanning from './StrategyPlanning.jsx';
import { fetchStrategy } from '../features/strategies/strategiesSlice.js';

const MainContent = () => {
  const dispatch = useDispatch();
  const { selectedId, selectedType } = useSelector((state) => state.users);
  const [tab, setTab] = useState("history");

  useEffect(() => {
    if (selectedId && selectedType === 'user') {
      dispatch(fetchStrategy(selectedId));
    }
  }, [dispatch, selectedId, selectedType]);

  // Show Dashboard when no user is selected
  if (!selectedId) {
    return <Dashboard />;
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="history" className="h-full flex flex-col" value={tab} onValueChange={setTab}>
        <div className="border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="history">History & Details</TabsTrigger>
            <TabsTrigger value="strategy">Strategy Planning</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-hidden">
          <TabsContent value="history" className="h-full m-0 p-0 overflow-auto">
            <HistoryDetails />
          </TabsContent>
          <TabsContent value="strategy" className="h-full m-0 p-0 overflow-auto">
            <StrategyPlanning />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MainContent;
