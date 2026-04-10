import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import './App.css'; // Let's remove this if we don't need it. But wait, I'll just use inline or modules. I'll delete App.css import and define structure.

function App() {
  return (
    <div className="flex-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {/* Add more routes here later for Logs, Settings, etc. */}
        </Routes>
      </main>
    </div>
  );
}

export default App;
