import React, { createContext, useState, useContext } from 'react';

const RefreshContext = createContext();

export const RefreshProvider = ({ children }) => {
  const [refreshCount, setRefreshCount] = useState(0);

  const triggerRefresh = () => {
    // Increment the refresh count to trigger side effects
    setRefreshCount(prev => prev + 1);
  };

  return (
    <RefreshContext.Provider value={{ refresh: refreshCount, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => useContext(RefreshContext);