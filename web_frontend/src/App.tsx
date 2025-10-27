import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';

// Pages
import { Home } from './pages/Home';
import { CreateRoom } from './pages/CreateRoom';
import { JoinRoom } from './pages/JoinRoom';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';
import { GameOver } from './pages/GameOver';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/lobby/:roomId" element={<Lobby />} />
          <Route path="/game/:roomId" element={<Game />} />
          <Route path="/gameover/:roomId" element={<GameOver />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
