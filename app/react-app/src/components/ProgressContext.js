import React, { createContext, useState } from 'react';

export const ProgressContext = createContext();

export const ProgressProvider = ({ children }) => {
  const [projectPercentages, setProjectPercentages] = useState({});
  const [streamPercentages, setStreamPercentages] = useState({});

  return (
    <ProgressContext.Provider value={{ projectPercentages, setProjectPercentages, streamPercentages, setStreamPercentages }}>
      {children}
    </ProgressContext.Provider>
  );
};
