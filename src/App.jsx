import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css'; // <--- Importing the new look!

const BACKEND_URL = "https://project-k-backend-1.onrender.com";
const socket = io(BACKEND_URL);

function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: '', phone: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);
  const [amount, setAmount] = useState('');
  
  // Game States
  const [gameState, setGameState] = useState('IDLE'); 
  const [matchId, setMatchId] = useState(null);
  const [roll, setRoll] = useState(null);
  const [isRolling, setIsRolling] = useState(false); // Controls animation

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    // SOCKET LISTENERS
    socket.on('WAITING', () => setGameState('WAITING'));
    
    socket.on('GAME_START', ({ matchId }) => {
      setGameState('PLAYING');
      setMatchId(matchId);
      setRoll(null);
    });

    socket.on('ROLL_RESULT', ({ roll }) => {
      // 1. Start Animation
      setIsRolling(true);
      setRoll(null); // Hide number while rolling

      // 2. Stop Animation after 1 second & Show Number
      setTimeout(() => {
        setIsRolling(false);
        setRoll(roll);
      }, 1000);
    });

    return () => socket.off(); 
  }, []);

  // --- FUNCTIONS ---

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
        const userData = isLogin ? data.user : data;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } else {
        alert(data.error || "Auth Failed");
      }
    } catch (err) { alert("Connection Error"); }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setGameState('IDLE');
  };

  const withdrawMoney = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${BACKEND_URL}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, amount }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedUser = { ...user, balance: data.newBalance };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setAmount('');
        alert("✅ Cash Out Successful!");
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) { alert("Error connecting to server"); }
  };

  // --- RENDER ---
  
  if (!user) {
    return (
      <div className="app-container">
        <h1 className="gold-text">KUMASI CASINO 🎲</h1> {/* CHANGE NAME HERE */}
        <br/>
        {!isLogin && <input placeholder="Username" onChange={e => setForm({...form, username: e.target.value})} />}
        <input placeholder="Phone Number" onChange={e => setForm({...form, phone: e.target.value})} />
        <input type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
        
        <button className="btn-gold" onClick={handleAuth}>
          {isLogin ? "ENTER" : "CREATE ACCOUNT"}
        </button>
        
        <p style={{marginTop: '20px', color: '#888'}} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "New here? Register" : "Have an account? Login"}
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h3 style={{margin:0}}>{user.username}</h3>
        <button onClick={logout} style={{background:'none', border:'none', color:'#555'}}>Logout</button>
      </div>

      <h1 className="gold-text">GHS {user.balance}</h1>

      {/* BANKING */}
      <div className="action-box">
        <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
          <button className="btn-small deposit" style={{flex:1}}>Deposit</button>
          <button className="btn-small withdraw" style={{flex:1}} onClick={withdrawMoney}>Cash Out</button>
        </div>
      </div>

      {/* GAME AREA */}
      <div style={{marginTop: '40px'}}>
        {gameState === 'IDLE' && (
          <button className="btn-gold" onClick={() => socket.emit('FIND_MATCH')}>
            FIND MATCH (GHS 10)
          </button>
        )}

        {gameState === 'WAITING' && <h3 className="gold-text" style={{animation: 'pulse 1s infinite'}}>🔎 Searching...</h3>}

        {gameState === 'PLAYING' && (
          <div>
            <h3>Match Found!</h3>
            
            <div className="dice-box">
              {/* If rolling, show shaking dice emoji. If done, show number */}
              {isRolling ? (
                <div className="dice shaking">🎲</div>
              ) : (
                <div className="dice">{roll ? roll : "❓"}</div>
              )}
            </div>

            <button className="btn-gold" onClick={() => socket.emit('ROLL_DICE', { matchId })}>
              ROLL DICE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;