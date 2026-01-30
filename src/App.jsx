import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const BACKEND_URL = "https://project-k-backend-1.onrender.com";
const socket = io(BACKEND_URL);

function App() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: '', phone: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);
  const [amount, setAmount] = useState('');
  
  // Game State
  const [gameState, setGameState] = useState('IDLE'); // IDLE, WAITING, PLAYING, FINISHED
  const [matchId, setMatchId] = useState(null);
  const [myRoll, setMyRoll] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    socket.on('GAME_START', ({ matchId }) => {
      setGameState('PLAYING');
      setMatchId(matchId);
      setMyRoll(null);
      setStatusMsg("Game Started! ROLL YOUR DICE!");
      // Deduct 10 immediately visually
      updateLocalBalance(-10);
    });

    socket.on('MY_ROLL', ({ roll }) => {
      setMyRoll(roll);
      setStatusMsg("Waiting for opponent...");
    });

    socket.on('OPPONENT_ROLLED', ({ playerId }) => {
      if (playerId !== socket.id) setStatusMsg("Opponent has rolled! Your turn!");
    });

    socket.on('GAME_RESULT', ({ p1Roll, p2Roll, winner }) => {
      setGameState('FINISHED');
      const win = winner === user.phone;
      const draw = !winner;
      
      if (win) {
        setStatusMsg(`YOU WON! (+20 GHS)`);
        updateLocalBalance(20);
      } else if (draw) {
        setStatusMsg("DRAW! (+10 GHS)");
        updateLocalBalance(10);
      } else {
        setStatusMsg("YOU LOST!");
      }

      setTimeout(() => setGameState('IDLE'), 4000);
    });

    socket.on('ERROR', (data) => alert(data.message));
    return () => socket.off();
  }, [user]);

  // Helper to update balance on screen immediately
  const updateLocalBalance = (change) => {
    if (!user) return;
    const newBal = parseFloat(user.balance) + change;
    const updated = { ...user, balance: newBal };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
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
        // FORCE UPDATE SCREEN
        const updated = { ...user, balance: data.newBalance };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        setAmount('');
      } else {
        alert("Failed: " + data.message);
      }
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
        
        {gameState === 'WAITING' && <h3 className="gold-text">Waiting for opponent...</h3>}
        
        {gameState === 'PLAYING' && (
          <div>
            <h3>{statusMsg}</h3>
            <div className="dice-box">
               {myRoll ? <span style={{fontSize:50}}>🎲 {myRoll}</span> : <span className="shaking" style={{fontSize:50}}>🎲</span>}
            </div>
            {!myRoll && <button className="btn-gold" onClick={()=>socket.emit('ROLL_DICE', {matchId})}>ROLL DICE</button>}
          </div>
        )}

        {gameState === 'FINISHED' && <h2 className="gold-text">{statusMsg}</h2>}
      </div>
    </div>
  );
}

export default App;