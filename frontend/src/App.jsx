import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { fetchUsers, fetchAnalytics } from './features/users/usersSlice.js';
import Header from './components/Header.jsx';
import LeftSidebar from './components/LeftSidebar.jsx';
import MainContent from './components/MainContent.jsx';
import UploadModal from './components/UploadModal.jsx';

const App = () => {
  const dispatch = useDispatch();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchAnalytics());
  }, [dispatch]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header onOpenUpload={() => setUploadOpen(true)} search={search} onSearchChange={setSearch} />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[300px] border-r border-border h-full">
          <LeftSidebar search={search} />
        </div>
        <div className="flex-1 h-full overflow-hidden">
          <MainContent />
        </div>
      </div>
      <footer className="p-1 text-center border-t border-border">
        <span className="text-xs text-muted-foreground">Collections App prototype</span>
      </footer>
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
};

export default App;
