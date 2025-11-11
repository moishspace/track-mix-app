// App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; 
import Home from './pages/Home';
import MixerPage from './pages/MixerPage';

// Inside <Routes>
<Route path="/mixer" element={<MixerPage />} />
import './App.css';
import { CssBaseline } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

const App = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <ErrorBoundary>
          <div className="app-container">
            <Routes>
              <Route
                path="/"
                element={<Home isAuthorized={isAuthorized} setIsAuthorized={setIsAuthorized} />}
              />
               <Route path="/mixer" element={<MixerPage />} />
            </Routes>
          </div>
          <ToastContainer /> {/* Add ToastContainer here */}
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  );
};

export default App;