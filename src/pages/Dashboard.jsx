import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) navigate('/login');
    else setUser(JSON.parse(storedUser));
  }, []);

  if (!user) return <h2>Loading...</h2>;

  return (
    <div style={{textAlign:'center', padding:'30px', color:'white'}}>
      <h1 style={{color:'var(--gold)'}}>WELCOME, {user.username}</h1>
      <div style={{background:'var(--card-bg)', padding:'20px', borderRadius:'15px', margin:'20px 0'}}>
        <p style={{color:'#aaa'}}>Balance</p>
        <h2 style={{fontSize:'2.5rem'}}>GHS {user.balance}</h2>
      </div>
      <button onClick={()=>{localStorage.clear(); navigate('/login');}} style={{color:'#64748b', background:'transparent'}}>LOGOUT</button>
    </div>
  );
}
export default Dashboard;