import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

// --- CONNECT TO GAME SERVER ---
const socket = io('https://project-k-backend-1.onrender.com');
// --- STYLES ---
const styles = {
  container: { textAlign: 'center', padding: '20px', maxWidth: '400px', margin: '0 auto', color: 'white', fontFamily: 'sans-serif' },
  input: { padding: '12px', width: '100%', borderRadius: '8px', border: 'none', marginBottom: '10px', boxSizing: 'border-box' },
  btnGold: { width: '100%', padding: '15px', background: '#fbbf24', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', color: 'black' },
  btnRed: { width: '100%', padding: '15px', background: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', color: 'white' },
  btnOutline: { width: '100%', padding: '15px', background: 'transparent', border: '2px solid #fbbf24', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#fbbf24' },
  card: { background: '#1e293b', padding: '20px', borderRadius: '15px', margin: '20px 0', border: '1px solid #334155' },
  dice: { fontSize: '4rem', margin: '20px' }
};

// --- 1. HOME ---
function Home() {
  const navigate = useNavigate();
  return (
    <div style={{...styles.container, paddingTop: '50px'}}>
      <h1 style={{fontSize:'3rem'}}>PROJECT <span style={{color:'#fbbf24'}}>K</span></h1>
      <button onClick={() => navigate('/login')} style={styles.btnGold}>LOGIN</button>
      <button onClick={() => navigate('/register')} style={styles.btnOutline}>REGISTER</button>
    </div>
  );
}

// --- 2. LOGIN ---
function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

const handleLogin = async () => {
  try {
    const res = await fetch('https://project-k-backend-1.onrender.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user)); // Saves Phone & Balance
        navigate('/dashboard');
      } else { alert(data.error); }
    } catch (err) { alert("Server Error"); }
  };

  return (
    <div style={styles.container}>
      <h2 style={{color: '#fbbf24'}}>LOGIN</h2>
      <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} style={styles.input} />
      <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={styles.input} />
      <button onClick={handleLogin} style={styles.btnGold}>ENTER</button>
      <p onClick={() => navigate('/register')} style={{color: '#94a3b8', cursor: 'pointer'}}>No account? Register</p>
    </div>
  );
}

// --- 3. REGISTER ---
function Register() {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

const handleRegister = async () => {
  try {
    const res = await fetch('https://project-k-backend-1.onrender.com/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, phone, password })
    });
      if (res.ok) { alert("Success! Login now."); navigate('/login'); }
      else { const data = await res.json(); alert(data.error); }
    } catch (err) { alert("Server Error"); }
  };

  return (
    <div style={styles.container}>
      <h2 style={{color: '#fbbf24'}}>REGISTER</h2>
      <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} style={styles.input} />
      <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} style={styles.input} />
      <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={styles.input} />
      <button onClick={handleRegister} style={styles.btnOutline}>JOIN NOW</button>
      <p onClick={() => navigate('/login')} style={{color: '#94a3b8', cursor: 'pointer'}}>Has account? Login</p>
    </div>
  );
}

// --- 4. DASHBOARD & GAME ---
function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  // Game States
  const [gameState, setGameState] = useState('IDLE'); // IDLE, SEARCHING, PLAYING, GAME_OVER
  const [matchId, setMatchId] = useState(null);
  const [myRoll, setMyRoll] = useState(null);
  const [opponentRoll, setOpponentRoll] = useState(null);
  const [gameResult, setGameResult] = useState('');

  // LOAD USER
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      
const res = await fetch('https://project-k-backend-1.onrender.com/me', {
  headers: { 'Authorization': token }
});
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        navigate('/login');
      }
    };
    fetchUser();
  }, []);

  // SOCKET LISTENERS
  useEffect(() => {
    socket.on('WAITING', (data) => setGameState('SEARCHING'));
    
    socket.on('GAME_START', (data) => {
      setMatchId(data.matchId);
      setGameState('PLAYING');
      setMyRoll(null); setOpponentRoll(null); setGameResult('');
      // Deduct money visually immediately
      if(user) setUser(prev => ({...prev, balance: prev.balance - 10})); 
    });

    socket.on('ROLL_RESULT', (data) => {
      if (data.playerId === socket.id) setMyRoll(data.roll);
      else setOpponentRoll(data.roll);
    });

    socket.on('GAME_OVER', (data) => {
      setGameResult(data.message);
      setGameState('GAME_OVER');
      // Refresh balance after 2 seconds to show winnings
      setTimeout(() => window.location.reload(), 3000);
    });

    return () => socket.off(); // Cleanup
  }, [user]);

  const handleDeposit = async () => {
    if (!user) return;
    try {
const res = await fetch('https://project-k-backend-1.onrender.com/deposit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: user.phone, amount: 50 })
});

const withdrawMoney = async () => {
    if (!user) return;
    try {
      const res = await fetch('https://project-k-backend-1.onrender.com/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, amount: withdrawAmount })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Withdrawal Successful!");
        setUser({ ...user, balance: data.newBalance });
        setWithdrawAmount('');
      } else {
        alert(data.message);
      }
    } catch (err) { alert("Connection Error"); }
  };
      const data = await res.json();
      if (res.ok) setUser({ ...user, balance: data.newBalance });
    } catch (err) { alert("Connection Error"); }
  };

  const findMatch = () => {
    if (user.balance < 10) return alert("Insufficient Funds! Please Deposit.");
    socket.emit('FIND_MATCH', { gameType: 'DICE', stake: 10, userId: user.id });
    setGameState('SEARCHING');
  };

  const rollDice = () => {
    if (!matchId) return;
    socket.emit('ROLL_DICE', { matchId });
  };

  if (!user) return <h2 style={{color:'white', textAlign:'center'}}>Loading...</h2>;

  // --- VIEW: GAME SCREEN ---
  if (gameState === 'PLAYING' || gameState === 'GAME_OVER') {
    return (
      <div style={styles.container}>
        <h2 style={{color: '#fbbf24'}}>MATCH STARTED</h2>
        <div style={{display:'flex', justifyContent:'space-around', margin:'30px 0'}}>
          <div>
            <p>YOU</p>
            <div style={styles.dice}>{myRoll || '❓'}</div>
          </div>
          <div>
            <p>OPPONENT</p>
            <div style={styles.dice}>{opponentRoll || '❓'}</div>
          </div>
        </div>

        {gameState === 'PLAYING' && !myRoll && (
          <button onClick={rollDice} style={styles.btnGold}>ROLL DICE 🎲</button>
        )}
        
        {gameState === 'PLAYING' && myRoll && !opponentRoll && (
          <p>Waiting for opponent...</p>
        )}

        {gameState === 'GAME_OVER' && (
          <div style={styles.card}>
            <h1 style={{color: gameResult.includes('Wins') ? '#fbbf24' : 'white'}}>{gameResult}</h1>
            <p>Returning to lobby...</p>
          </div>
        )}
      </div>
    );
  }

  // --- VIEW: LOBBY ---
  return (
    <div style={styles.container}>
      <h1 style={{color: '#fbbf24'}}>HELLO, {user.username}</h1>
      
      <div style={styles.card}>
        <p style={{color: '#94a3b8'}}>Balance</p>
        <h2 style={{fontSize: '3rem', margin: '10px 0', color: 'white'}}>GHS {user.balance}</h2>
        <button onClick={handleDeposit} style={{...styles.btnOutline, fontSize:'0.9rem', padding:'10px'}}>+ DEPOSIT 50 GHS</button>
      </div>

      {/* NEW WITHDRAW SECTION */}
      <div style={styles.card}>
        <h3 style={{color: '#ef4444'}}>📉 Withdraw</h3>
        <input 
          type="number" 
          placeholder="Amount (GHS)" 
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          style={{...styles.input, marginBottom: '5px'}} 
        />
        <button onClick={withdrawMoney} style={styles.btnRed}>CASH OUT</button>
      </div>

      {gameState === 'IDLE' && (
        <button onClick={findMatch} style={styles.btnGold}>FIND MATCH (GHS 10)</button>
      )}

      {gameState === 'SEARCHING' && (
        <div style={styles.card}>
          <h3>🔍 Searching for Opponent...</h3>
          <p>Please wait...</p>
        </div>
      )}

      <br/><br/>
      <button onClick={() => {localStorage.clear(); navigate('/login')}} style={{color:'#94a3b8', background:'transparent', border:'none', cursor:'pointer'}}>LOGOUT</button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}