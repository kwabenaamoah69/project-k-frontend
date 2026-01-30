import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css'; 

const BACKEND_URL = "https://project-k-backend-1.onrender.com"; // CHECK THIS LINK!
const socket = io(BACKEND_URL);

function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: '', phone: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);
  const [amount, setAmount] = useState('');
  
  // Game States
  const [gameState, setGameState] = useState('IDLE'); 
  const [matchId, setMatchId] = useState(null);
  const [myRoll, setMyRoll] = useState(null);
  const [opRoll, setOpRoll] = useState(null);
  const [resultMsg, setResultMsg] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    // GAME LISTENERS
    socket.on('GAME_START', ({ matchId }) => {
      setGameState('PLAYING');
      setMatchId(matchId);
      setMyRoll(null);
      setOpRoll(null);
      setResultMsg("");
    });

    socket.on('ROLL_ANIMATION', () => {
      // Just a visual cue that someone rolled
      console.log("Someone is rolling...");
    });

    socket.on('GAME_OVER', ({ myRoll, opRoll, result }) => {
      setMyRoll(myRoll);
      setOpRoll(opRoll);
      setResultMsg(result);
      setGameState('FINISHED');
      
      // Refresh Balance after 3 seconds
      setTimeout(() => {
        window.location.reload(); 
      }, 4000);
    });

    socket.on('ERROR', (data) => alert(data.message));

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
        const userData = isLogin ? data.user : data;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } else {
        alert(data.error);
      }
    } catch (err) { alert("Server Connection Failed"); }
  };

  const updateBalance = async (type) => {
    if (!amount) return alert("Enter amount");
    try {
      const res = await fetch(`${BACKEND_URL}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, amount }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${type.toUpperCase()} Successful!`);
        window.location.reload(); // Reload to show new balance
      } else {
        alert("❌ Failed: " + data.message);
      }
    } catch (err) { alert("Connection Error"); }
  };

  const findMatch = () => {
    socket.emit('FIND_MATCH', { phone: user.phone });
    setGameState('WAITING');
  };

  // --- RENDER ---
  if (!user) {
    return (
      <div className="app-container">
        <h1 className="gold-text">KUMASI CASINO 🎲</h1>
        <br/>
        {!isLogin && <input placeholder="Username" onChange={e => setForm({...form, username: e.target.value})} />}
        <input placeholder="Phone Number" onChange={e => setForm({...form, phone: e.target.value})} />
        <input type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
        <button className="btn-gold" onClick={handleAuth}>{isLogin ? "ENTER" : "REGISTER"}</button>
        <p style={{color:'#888', marginTop:'20px'}} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Create Account" : "Login"}
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <h3 style={{color:'#888'}}>{user.username}</h3>
        <button onClick={() => {localStorage.clear(); window.location.reload()}} style={{background:'none', border:'none', color:'red'}}>Logout</button>
      </div>
      
      <h1 className="gold-text">GHS {user.balance}</h1>

      <div className="action-box">
        <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
          <button className="btn-small deposit" onClick={() => updateBalance('deposit')}>DEPOSIT</button>
          <button className="btn-small withdraw" onClick={() => updateBalance('withdraw')}>CASH OUT</button>
        </div>
      </div>

      <div style={{marginTop: '40px'}}>
        {gameState === 'IDLE' && (
          <button className="btn-gold" onClick={findMatch}>FIND MATCH (10 GHS)</button>
        )}

        {gameState === 'WAITING' && <h3 className="gold-text">🔎 Searching for Opponent...</h3>}

        {gameState === 'PLAYING' && (
          <div>
            <h3>Game On!</h3>
            <div className="dice-box"><div className="dice shaking">🎲</div></div>
            <button className="btn-gold" onClick={() => socket.emit('ROLL_DICE', { matchId })}>ROLL!</button>
          </div>
        )}

        {gameState === 'FINISHED' && (
          <div>
            <h2 className="gold-text">{resultMsg}</h2>
            <div style={{display:'flex', justifyContent:'space-around', fontSize:'30px'}}>
              <div>You: {myRoll}</div>
              <div>Them: {opRoll}</div>
            </div>
            <p>Restarting...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;