import React from "react";
import HandTracker from "./components/HandTracker";
import Experience from "./components/Experience";
import IntroOverlay from "./components/IntroOverlay";
import ErrorBoundary from "./components/ErrorBoundary";

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="relative w-full h-full overflow-hidden">
        <IntroOverlay />
        <Experience />
        <HandTracker />
      </div>
    </ErrorBoundary>
  );
};

export default App;
