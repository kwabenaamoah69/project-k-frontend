import { useState, useEffect } from 'react';
import io from 'socket.io-client';

// --- CONFIGURATION ---
// This is your backend link. 
const BACKEND_URL = "https://project-k-backend-1.onrender.com";
const socket = io(BACKEND_URL);

function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: '', phone: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);
  const [amount, setAmount] = useState('');
  const [gameState, setGameState] = useState('IDLE'); // IDLE, WAITING, PLAYING
  const [matchId, setMatchId] = useState(null);
  const [roll, setRoll] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Game Listeners
    socket.on('WAITING', () => setGameState('WAITING'));
    socket.on('GAME_START', ({ matchId }) => {
      setGameState('PLAYING');
      setMatchId(matchId);
      alert("Game Started! Roll the dice!");
    });
    socket.on('ROLL_RESULT', ({ playerId, roll }) => {
      setRoll(roll);
      alert(`Player rolled a ${roll}!`);
    });

    return () => socket.off(); 
  }, []);

  // --- ACTIONS ---

  const handleAuth = async () => {
    const endpoint = isLogin ? '/login' : '/register';
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (res.ok) {
        // If login/register works, save user and update screen
        const userData = isLogin ? data.user : data;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        alert(`Welcome ${userData.username || 'User'}!`);
      } else {
        alert("Error: " + (data.error || data.message || "Something went wrong"));
      }
    } catch (err) {
      alert("Connection Failed. Check Server.");
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setGameState('IDLE');
  };

  const withdrawMoney = async () => {
    if (!user || !user.phone) {
      alert("Error: Please Logout and Login again to refresh your data.");
      return;
    }
    if (!amount) return alert("Enter an amount first!");

    try {
      const res = await fetch(`${BACKEND_URL}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, amount: amount }),
      });
      const data = await res.json();
      if (data.success) {
        // Update balance on screen
        const updatedUser = { ...user, balance: data.newBalance };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setAmount('');
        alert("✅ Cash Out Successful!");
      } else {
        alert("❌ Failed: " + data.message);
      }
    } catch (err) {
      alert("Server Connection Error");
    }
  };

  const depositMoney = async () => {
    if (!amount) return alert("Enter an amount");
    // Simple deposit simulation
    try {
       const res = await fetch(`${BACKEND_URL}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, amount: amount }),
      });
      const data = await res.json();
      const updatedUser = { ...user, balance: data.newBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setAmount('');
      alert("Deposit Successful (Simulated)");
    } catch(err) {
      alert("Deposit Error");
    }
  };

  const findMatch = () => {
    socket.emit('FIND_MATCH', { playerId: user.id });
  };

  const rollDice = () => {
    socket.emit('ROLL_DICE', { matchId });
  };

  // --- RENDER SCREEN ---

  if (!user) {
    // LOGIN / REGISTER SCREEN
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
        <h1>Dice King 🎲</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: 'auto' }}>
          {!isLogin && (
            <input 
              placeholder="Username" 
              onChange={(e) => setForm({...form, username: e.target.value})} 
              style={{ padding: '10px' }}
            />
          )}
          <input 
            placeholder="Phone Number" 
            onChange={(e) => setForm({...form, phone: e.target.value})} 
            style={{ padding: '10px' }}
          />
          <input 
            type="password" 
            placeholder="Password" 
            onChange={(e) => setForm({...form, password: e.target.value})} 
            style={{ padding: '10px' }}
          />
          <button onClick={handleAuth} style={{ padding: '10px', background: '#efb810', border: 'none', fontWeight: 'bold' }}>
            {isLogin ? "ENTER" : "REGISTER"}
          </button>
          <p onClick={() => setIsLogin(!isLogin)} style={{ color: '#ccc', cursor: 'pointer' }}>
            {isLogin ? "Need an account? Register" : "Have an account? Login"}
          </p>
        </div>
      </div>
    );
  }

  // DASHBOARD SCREEN
  return (
    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#121212', color: 'white', minHeight: '100vh' }}>
      <h1 style={{ color: '#efb810' }}>{user.username}</h1>
      <p>Balance</p>
      <h2 style={{ fontSize: '40px', margin: '10px 0' }}>GHS {user.balance}</h2>

      {/* WITHDRAW / DEPOSIT AREA */}
      <div style={{ backgroundColor: '#222', padding: '15px', borderRadius: '10px', margin: '20px 0' }}>
        <input 
          type="number" 
          placeholder="Amount" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ padding: '10px', width: '60%', marginRight: '10px' }}
        />
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={depositMoney} style={{ padding: '10px 20px', background: 'green', color: 'white', border: 'none' }}>
            Deposit
          </button>
          <button onClick={withdrawMoney} style={{ padding: '10px 20px', background: 'red', color: 'white', border: 'none' }}>
            Cash Out
          </button>
        </div>
      </div>

      {/* GAME AREA */}
      <div style={{ marginTop: '40px' }}>
        {gameState === 'IDLE' && (
          <button onClick={findMatch} style={{ width: '100%', padding: '15px', background: '#efb810', border: 'none', fontWeight: 'bold', fontSize: '18px' }}>
            FIND MATCH (GHS 10)
          </button>
        )}
        
        {gameState === 'WAITING' && <h3>🔎 Searching for player...</h3>}
        
        {gameState === 'PLAYING' && (
          <div>
            <h3>Match Found! ⚔️</h3>
            <div style={{ fontSize: '50px', margin: '20px' }}>
              {roll ? `🎲 ${roll}` : "❓"}
            </div>
            <button onClick={rollDice} style={{ padding: '15px', background: 'blue', color: 'white', border: 'none', borderRadius: '5px' }}>
              ROLL DICE
            </button>
          </div>
        )}
      </div>

      <button onClick={logout} style={{ marginTop: '50px', background: 'transparent', border: 'none', color: '#555' }}>
        LOGOUT
      </button>
    </div>
  );
}

export default App;