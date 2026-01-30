import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const BACKEND_URL = "https://project-k-backend-1.onrender.com"; // CHECK YOUR URL
const socket = io(BACKEND_URL);

function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: '', phone: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);
  const [amount, setAmount] = useState('');
  
  // Game Vars
  const [gameState, setGameState] = useState('IDLE'); // IDLE, WAITING, PLAYING
  const [matchId, setMatchId] = useState(null);
  const [myRoll, setMyRoll] = useState(null);
  const [opRoll, setOpRoll] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    // SOCKET LISTENERS
    socket.on('WAITING', () => setGameState('WAITING'));

    socket.on('GAME_START', ({ matchId }) => {
      setGameState('PLAYING');
      setMatchId(matchId);
      setMyRoll(null);
      setOpRoll(null);
      alert("MATCH STARTED! -10 GHS");
      // Update balance visually
      updateLocalBalance(-10);
    });

    socket.on('ROLL_RESULT', ({ playerId, roll }) => {
      if (playerId === socket.id) {
        setMyRoll(roll);
      } else {
        setOpRoll(roll);
      }
    });

    return () => socket.off();
  }, []);

  // Check Winner Helper
  useEffect(() => {
    if (myRoll && opRoll) {
      setTimeout(() => {
        if (myRoll > opRoll) {
          alert("YOU WON! +20 GHS");
          updateLocalBalance(20);
          // Send update to server (simplified for now)
          updateServerBalance(20);
        } else if (opRoll > myRoll) {
          alert("YOU LOST!");
        } else {
          alert("DRAW! +10 GHS");
          updateLocalBalance(10);
          updateServerBalance(10);
        }
        setGameState('IDLE');
      }, 1000);
    }
  }, [myRoll, opRoll]);

  // --- ACTIONS ---

  const updateLocalBalance = (change) => {
    if(!user) return;
    const newBal = parseFloat(user.balance) + change;
    const u = { ...user, balance: newBal };
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  const updateServerBalance = async (amount) => {
    await fetch(`${BACKEND_URL}/balance-update`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ phone: user.phone, amount, type: 'deposit' })
    });
  };

  const handleAuth = async () => {
    const endpoint = isLogin ? '/login' : '/register';
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        const u = isLogin ? data.user : data;
        localStorage.setItem('user', JSON.stringify(u));
        setUser(u);
      } else alert(data.error);
    } catch (e) { alert("Connection Error"); }
  };

  const handleMoney = async (type) => {
    if (!amount) return;
    try {
      const res = await fetch(`${BACKEND_URL}/balance-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, amount, type })
      });
      const data = await res.json();
      if (data.success) {
        alert("Success!");
        const u = { ...user, balance: data.newBalance };
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
        setAmount('');
      } else alert("Failed");
    } catch (e) { alert("Error"); }
  };

  if (!user) {
    return (
      <div className="app-container">
        <h1 className="gold-text">KUMASI CASINO</h1>
        {!isLogin && <input placeholder="Username" onChange={e=>setForm({...form, username:e.target.value})}/>}
        <input placeholder="Phone" onChange={e=>setForm({...form, phone:e.target.value})}/>
        <input type="password" placeholder="Password" onChange={e=>setForm({...form, password:e.target.value})}/>
        <button className="btn-gold" onClick={handleAuth}>{isLogin ? "LOGIN" : "REGISTER"}</button>
        <p onClick={()=>setIsLogin(!isLogin)} style={{color:'white', marginTop:10}}>Switch to {isLogin ? "Register" : "Login"}</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div style={{display:'flex', justifyContent:'space-between', color:'white'}}>
        <span>{user.username}</span>
        <span onClick={()=>{localStorage.clear(); window.location.reload()}}>Logout</span>
      </div>
      <h1 className="gold-text">GHS {parseFloat(user.balance).toFixed(2)}</h1>

      <div className="action-box">
        <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount"/>
        <div style={{display:'flex', gap:10, marginTop:10}}>
          <button className="btn-small deposit" onClick={()=>handleMoney('deposit')}>DEPOSIT</button>
          <button className="btn-small withdraw" onClick={()=>handleMoney('withdraw')}>CASHOUT</button>
        </div>
      </div>

      <div style={{marginTop: 30}}>
        {gameState === 'IDLE' && <button className="btn-gold" onClick={()=>socket.emit('FIND_MATCH', {phone: user.phone})}>FIND MATCH (10 GHS)</button>}
        
        {gameState === 'WAITING' && <h3 className="gold-text">Waiting for Player 2...</h3>}
        
        {gameState === 'PLAYING' && (
          <div>
            <h3>GAME ON!</h3>
            <div style={{display:'flex', justifyContent:'space-around', margin: '20px 0'}}>
              <div>You: {myRoll ? myRoll : "?"}</div>
              <div>Opponent: {opRoll ? opRoll : "?"}</div>
            </div>
            {!myRoll && <button className="btn-gold" onClick={()=>socket.emit('ROLL_DICE', {matchId})}>ROLL DICE</button>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;