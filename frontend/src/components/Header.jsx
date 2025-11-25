import React from 'react';
import { useDispatch } from 'react-redux';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clearSelection } from '../features/users/usersSlice.js';

const Header = ({ onOpenUpload, search, onSearchChange }) => {
  const dispatch = useDispatch();

  const handleHomeClick = () => {
    dispatch(clearSelection());
  };

  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleHomeClick}
            className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
          >
            <Home className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold cursor-pointer" onClick={handleHomeClick}>
            Collections App
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-[300px]">
            <Input
              placeholder="Search users/groups"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-primary-foreground text-primary border-none placeholder:text-muted-foreground"
            />
          </div>
          <Button variant="secondary" onClick={onOpenUpload}>
            Add Users / Upload CSV
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
